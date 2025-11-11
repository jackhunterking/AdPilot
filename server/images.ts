"use server";

import { generateText } from 'ai';
import { buildImagePrompt } from '../lib/creative/prompt-builder';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { supabaseServer } from '@/lib/supabase/server';

// Upload image buffer to Supabase Storage (exported for reuse in API routes)
export async function uploadToSupabase(
    imageBuffer: Buffer,
    fileName: string,
    campaignId?: string,
    metadata?: { variationType: string; category: string }
): Promise<string> {
    try {
        // Validate Supabase is configured
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured. Please add it to .env.local');
        }
        
        // Generate path with campaign folder if provided
        const path = campaignId 
            ? `campaigns/${campaignId}/${fileName}`
            : `temp/${fileName}`;

        console.log(`📤 Uploading to Supabase: ${path} (${imageBuffer.length} bytes)`, metadata ? `[${metadata.category}]` : '');

        // Upload to Supabase Storage with variation metadata
        const { data, error } = await supabaseServer
            .storage
            .from('campaign-assets')
            .upload(path, imageBuffer, {
                contentType: 'image/png',
                cacheControl: '3600',
                upsert: false,
                metadata: metadata || {}
            });

        if (error) {
            console.error('Supabase upload error:', {
                fileName,
                campaignId,
                path,
                errorMessage: error.message,
                errorName: error.name,
            });
            throw new Error(`Failed to upload to Supabase: ${error.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseServer
            .storage
            .from('campaign-assets')
            .getPublicUrl(path);

        console.log(`✅ Uploaded to Supabase: ${publicUrl}`);
        return publicUrl;
    } catch (error) {
        console.error('Error uploading to Supabase:', {
            fileName,
            campaignId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
}

// Meta-specific prompt enhancement for visual guardrails
function enhancePromptWithMetaGuardrails(userPrompt: string, variationType?: string, goalType?: string): string {
let goalSpecificGuidance = '';
if (goalType) {
  if (goalType === 'calls') {
    goalSpecificGuidance = `\n\nGOAL CONTEXT (Calls): Create visuals that suggest personal connection, accessibility, and trust. Imagery should contextually imply calling/contact as the natural next action without being too literal.\n`;
  } else if (goalType === 'leads') {
    goalSpecificGuidance = `\n\nGOAL CONTEXT (Leads): Create visuals that suggest information gathering, professional consultation, or value exchange. Imagery should inspire trust and convey expertise that makes viewers want to learn more.\n`;
  } else if (goalType === 'website-visits') {
    goalSpecificGuidance = `\n\nGOAL CONTEXT (Website Visits): Create visuals that suggest browsing, discovery, and digital engagement. Imagery should inspire curiosity and showcase products/services that viewers want to explore online.\n`;
  }
}

    // Centralized PromptBuilder composes a qualitative, safe prompt (no numeric safe-zones or f-numbers)
    return buildImagePrompt({ content: `${userPrompt}${goalSpecificGuidance}` });
}

// Validate that the generated image does not include overlays, frames, or numeric labels
async function validateImageForOverlays(imageBuffer: Buffer, mediaType: string): Promise<boolean> {
    try {
        const result = await generateText({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Inspect this image. If it contains any text overlays, frames/borders, crop marks, guides, percentages, numbers, camera readouts (f/..), watermarks, or corner labels, reply only BAD. Otherwise reply only CLEAN.'
                        },
                        {
                            type: 'file',
                            mediaType,
                            data: imageBuffer,
                        }
                    ]
                }
            ]
        });
        const verdictRaw = (result.text ?? '').trim().toUpperCase();
        const verdict = verdictRaw.startsWith('CLEAN');
        return verdict;
    } catch {
        // Fail-open if validation API fails
        return true;
    }
}

export async function generateImage(
    prompt: string, 
    campaignId?: string,
    numberOfImages: number = 3,
    goalType?: string
): Promise<string[]> {
    try {
        console.log(`🎨 Generating ${numberOfImages} AI-powered image variations...`);
        
        // Create unique batch ID to link all variations
        const batchId = crypto.randomUUID();
        
        // Define 3 distinct variation types - each offering a different creative approach
        // All variations MUST maintain hyper-realistic photography standards
        const variationPrompts = [
            { 
                type: 'hero_shot', 
                category: 'Classic & Professional',
                suffix: 'Hero shot: Clean, professional composition with subject centered. Balanced lighting, neutral tones, editorial magazine style. Subtle shallow depth of field as appropriate. Perfect for professional, trustworthy brand image.'
            },
            { 
                type: 'lifestyle_authentic', 
                category: 'Lifestyle & Authentic',
                suffix: 'Lifestyle photography: Natural, candid moment captured in real environment. Warm, inviting golden hour lighting. Gentle background blur; authentic, relatable, human-centric feel - perfect for emotional connection.'
            },
            { 
                type: 'editorial_dramatic', 
                category: 'Editorial & Bold',
                suffix: 'Editorial style: High-contrast, dramatic lighting with bold shadows. Cinematic color grading, moody atmosphere. Compressed-perspective look; eye-catching, sophisticated, premium brand positioning.'
            }
        ];

        // Generate all variations in parallel
        const generationPromises = variationPrompts.slice(0, numberOfImages).map(async (variation, index) => {
            try {
                // Enhance prompt with Meta guardrails and variation-specific styling
                const enhancedPrompt = enhancePromptWithMetaGuardrails(
                    `${prompt}\n\n${variation.suffix}`,
                    variation.type,
                    goalType
                );
                
                console.log(`  → Generating variation ${index + 1}/${numberOfImages}: ${variation.category} (${variation.type})`);
                
                const result = await generateText({
                    model: 'google/gemini-2.5-flash-image-preview',
                    prompt: enhancedPrompt,
                    providerOptions: {
                        google: { 
                            responseModalities: ['TEXT', 'IMAGE'] 
                        },
                    },
                });

                // Process the generated image
                for (const file of result.files) {
                    if (file.mediaType.startsWith('image/')) {
                        const timestamp = Date.now();
                        const fileName = `generated-${variation.type}-${timestamp}-${index}.png`;
                        let imageBuffer = Buffer.from(file.uint8Array);

                        // Validate the image does not contain overlays/labels; if it does, regenerate once with stronger negatives
                        const isClean = await validateImageForOverlays(imageBuffer, file.mediaType);
                        if (!isClean) {
                            console.warn(`  ⚠️  Overlay/label detected in variation ${index + 1}. Regenerating with stronger negatives...`);
                            const stronger = `${enhancedPrompt}\n\nABSOLUTE BAN: Do not add any frames, borders, guides, crop marks, rulers, numbers, percentages, camera readouts (e.g., f/2.8), EXIF text, watermarks, captions, or labels of any kind.`;
                            const retry = await generateText({
                                model: 'google/gemini-2.5-flash-image-preview',
                                prompt: stronger,
                                providerOptions: { google: { responseModalities: ['TEXT', 'IMAGE'] } },
                            });
                            for (const f2 of retry.files) {
                                if (f2.mediaType.startsWith('image/')) {
                                    imageBuffer = Buffer.from(f2.uint8Array);
                                    break;
                                }
                            }
                        }

                        // Upload to Supabase Storage with variation metadata
                        const publicUrl = await uploadToSupabase(
                            imageBuffer, 
                            fileName, 
                            campaignId,
                            {
                                variationType: variation.type,
                                category: variation.category
                            }
                        );

                        // Image URL is tracked in campaign_states.ad_preview_data
                        // No need for separate asset metadata table
                        console.log(`  ✅ Variation ${index + 1} saved: ${variation.category} (${variation.type})`);

                        return publicUrl;
                    }
                }

                // No image artifact returned for this variation
                console.warn(`  ⚠️  No image generated for variation ${index + 1} (${variation.type})`);
                return null;
            } catch (error) {
                console.error(`Error generating variation ${index + 1} (${variation.type}):`, error);
                // Return null to allow other variations to continue
                return null;
            }
        });

        // Wait for all variations to complete (tolerate partial failures)
        const settled = await Promise.allSettled(generationPromises);
        const imageUrls = settled
            .filter((r): r is PromiseFulfilledResult<string | null> => r.status === 'fulfilled')
            .map(r => r.value)
            .filter((u): u is string => typeof u === 'string' && u.length > 0);

        const failures = settled.filter(r => r.status === 'rejected').length
            + settled.filter(r => r.status === 'fulfilled' && (r.value === null)).length;

        if (imageUrls.length === 0) {
            throw new Error(`All ${numberOfImages} variations failed to generate an image`);
        }

        console.log(`✅ Generated ${imageUrls.length}/${numberOfImages} variations. Failures: ${failures}`);
        console.log(`   Batch ID: ${batchId}`);

        return imageUrls;
    } catch (error) {
        console.error('Error generating images:', error);
        throw error;
    }
}

export async function editImage(imageUrl: string, editPrompt: string, campaignId?: string) {
    try {
        let imageBuffer: Buffer;

        // Check if URL is from Supabase or local
        if (imageUrl.includes('supabase.co')) {
            // Fetch from Supabase URL
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
        } else {
            // Read from local public folder (legacy)
            const imagePath = imageUrl.startsWith('/') 
                ? `public${imageUrl}` 
                : imageUrl;
            imageBuffer = await fs.promises.readFile(imagePath);
        }
        
        // Determine media type from URL
        let mediaType = 'image/png';
        if (imageUrl.endsWith('.jpg') || imageUrl.endsWith('.jpeg')) {
            mediaType = 'image/jpeg';
        } else if (imageUrl.endsWith('.webp')) {
            mediaType = 'image/webp';
        }
        
        // Enhance edit prompt with Meta guardrails
        const enhancedEditPrompt = enhancePromptWithMetaGuardrails(editPrompt);
        
        // Use messages format with file input
        const result = await generateText({
            model: 'google/gemini-2.5-flash-image-preview',
            providerOptions: {
                google: { 
                    responseModalities: ['TEXT', 'IMAGE'] 
                },
            },
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `Edit this image with the following instructions: ${enhancedEditPrompt}

IMPORTANT: Maintain Meta's native ad aesthetic — natural, realistic, and mobile-optimized. Keep edges clean and NEVER add frames, borders, guides, crop marks, labels, text, or numbers.`,
                        },
                        {
                            type: 'file',
                            mediaType: mediaType,
                            data: imageBuffer,
                        },
                    ],
                },
            ],
        });

        let publicUrl = '';

        // Upload edited image to Supabase
        for (const file of result.files) {
            if (file.mediaType.startsWith('image/')) {
                const timestamp = Date.now();
                const fileName = `edited-${timestamp}.png`;
                const editedBuffer = Buffer.from(file.uint8Array);

                // Upload to Supabase Storage
                publicUrl = await uploadToSupabase(editedBuffer, fileName, campaignId);

                // Image URL is tracked in campaign_states.ad_preview_data
                // No need for separate asset metadata table
                console.log('  ✅ Edited image saved to storage');
            }
        }

        if (!publicUrl) {
            throw new Error('No image was generated from edit');
        }

        return publicUrl;
    } catch (error) {
        console.error('Error editing image:', error);
        throw error;
    }
}