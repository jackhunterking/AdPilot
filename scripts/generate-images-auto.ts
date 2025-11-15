#!/usr/bin/env tsx

/**
 * Automatic (non-interactive) image generation for all 40 businesses
 * Usage: npm run generate-homepage-images-auto
 */

// Load env first
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

import { generateText } from 'ai';
import fs from 'node:fs';
import path from 'node:path';

interface BusinessImage {
  fileName: string;
  prompt: string;
  businessName: string;
}

function enhancePrompt(basePrompt: string): string {
  return `${basePrompt}

CRITICAL REQUIREMENTS:
- Professional photography style, not illustration or digital art  
- Hyper-realistic, authentic look (no AI artifacts)
- Well-lit, high-quality, suitable for advertising
- 1080x1080px square format
- No text overlays, no frames, no borders
- No watermarks, labels, or captions
- Clean edges, professional composition
- Suitable for Facebook/Instagram ads

Style: Editorial magazine quality photography with natural lighting and professional composition.`;
}

// All 40 businesses
const businesses: BusinessImage[] = [
  {fileName: 'dental-office-smile.jpg', businessName: 'UrbanGlow Dental', prompt: 'Professional dental office with patient smiling after treatment, bright and clean, modern interior, natural lighting, professional photography'},
  {fileName: 'personal-trainer-workout.jpg', businessName: 'PrimeFit Personal Training', prompt: 'Personal trainer helping client with exercise in modern gym, motivational atmosphere, professional fitness training, natural gym lighting'},
  {fileName: 'clean-home-interior.jpg', businessName: 'FreshNest Cleaning Co.', prompt: 'Spotless, organized home interior, clean living room, fresh and tidy, bright natural light, professional cleaning result'},
  {fileName: 'detailed-shiny-car.jpg', businessName: 'SparkRide Auto Detailing', prompt: 'Shiny, freshly detailed luxury car exterior, water droplets on hood, professional car detailing, high-end automobile, studio lighting'},
  {fileName: 'beautiful-landscaped-yard.jpg', businessName: 'Bloomfield Landscaping', prompt: 'Professional landscaped backyard with lush green grass, flower beds, stone pathway, summer day, real estate photography quality'},
  {fileName: 'phone-repair-service.jpg', businessName: 'TechRevive Phone Repair', prompt: 'Technician repairing smartphone, professional phone repair shop, precision work with tools, technical expertise, clean workspace'},
  {fileName: 'beautiful-home-exterior.jpg', businessName: 'Maple & Stone Realtors', prompt: 'Attractive residential home exterior, modern house, well-maintained property, beautiful curb appeal, professional real estate photography'},
  {fileName: 'meal-prep-containers.jpg', businessName: 'Lifted Meals Prep Service', prompt: 'Healthy meal prep containers with fresh food, colorful vegetables, protein, balanced nutrition, professional food photography'},
  {fileName: 'facial-treatment-spa.jpg', businessName: 'LuxeSkin Aesthetics', prompt: 'Facial skincare treatment in spa setting, professional esthetician, relaxing atmosphere, luxury spa experience, serene lighting'},
  {fileName: 'groomed-happy-dog.jpg', businessName: 'Paw Haven Grooming', prompt: 'Well-groomed, happy dog after grooming session, fluffy and clean, professional pet grooming result, bright studio lighting'},
  {fileName: 'modern-interior-design.jpg', businessName: 'The Interior Loft', prompt: 'Stylish, modern interior design living room, contemporary furniture, tasteful decor, professional interior styling, natural daylight'},
  {fileName: 'professional-roofing-work.jpg', businessName: 'BluePeak Roofing', prompt: 'Roofers working on residential roof, professional roofing installation, safety equipment, quality craftsmanship, clear blue sky'},
  {fileName: 'student-tutoring-session.jpg', businessName: 'BrightPath Tutoring', prompt: 'Tutor helping student with studies, focused learning environment, educational materials, supportive teaching, bright study space'},
  {fileName: 'massage-therapy-session.jpg', businessName: 'ZenBody Massage Studio', prompt: 'Relaxing massage therapy treatment, professional massage therapist, serene spa atmosphere, calming lighting, wellness and relaxation'},
  {fileName: 'gourmet-catering-food.jpg', businessName: 'SilverSpoon Catering', prompt: 'Beautiful gourmet catered food display, elegant presentation, variety of dishes, professional catering setup, appetizing lighting'},
  {fileName: 'driving-lesson-car.jpg', businessName: 'DriveRight Instructors', prompt: 'Instructor teaching student to drive, dual-control car, learning environment, professional driving instruction, safe practice'},
  {fileName: 'healthy-smoothie-bowls.jpg', businessName: 'FitFuel Smoothie Bar', prompt: 'Colorful, healthy smoothies and bowls, fresh ingredients, vibrant presentation, nutritious and appetizing, natural food photography'},
  {fileName: 'crystal-clear-pool.jpg', businessName: 'AquaPure Pool Services', prompt: 'Crystal clear swimming pool, well-maintained, sparkling blue water, clean pool deck, professional pool service result, sunny day'},
  {fileName: 'beautiful-airbnb-interior.jpg', businessName: 'CozyNest AirBnB Management', prompt: 'Cozy, inviting Airbnb rental space, comfortable bedroom or living room, welcoming atmosphere, professional hospitality photography'},
  {fileName: 'chiropractic-adjustment.jpg', businessName: 'Thrive Chiropractic', prompt: 'Chiropractor performing adjustment on patient, professional chiropractic care, clinical setting, healthcare expertise, professional lighting'},
  {fileName: 'auto-mechanic-work.jpg', businessName: 'AutoGuard Mechanics', prompt: 'Mechanic working under car hood, professional auto repair shop, technical expertise, quality service, well-equipped garage'},
  {fileName: 'montessori-classroom-kids.jpg', businessName: 'Meadow Kids Montessori', prompt: 'Children in Montessori classroom learning, engaged students, educational materials, nurturing environment, bright natural classroom'},
  {fileName: 'fresh-coffee-beans-brewing.jpg', businessName: 'BoldBrew Coffee Co.', prompt: 'Fresh coffee beans and brewing equipment, artisan coffee roasting, rich dark beans, professional coffee photography, warm tones'},
  {fileName: 'clean-sparkling-windows.jpg', businessName: 'ShinePro Window Cleaning', prompt: 'Spotless, streak-free windows, crystal clear glass, clean home exterior, professional window cleaning result, bright daylight'},
  {fileName: 'solar-panels-installation.jpg', businessName: 'Horizon Solar Installers', prompt: 'Solar panels being installed on residential roof, renewable energy, professional installation, modern solar technology, clear sky'},
  {fileName: 'business-coaching-session.jpg', businessName: 'Peak Performance Coaching', prompt: 'Business coach with client, strategy session, professional office setting, leadership development, collaborative discussion'},
  {fileName: 'kitchen-bathroom-renovation.jpg', businessName: 'CraftedStone Renovations', prompt: 'Beautiful renovated kitchen or bathroom, modern fixtures, quality craftsmanship, stunning transformation, professional renovation photography'},
  {fileName: 'luxury-flower-arrangement.jpg', businessName: 'VelvetBloom Florist', prompt: 'Stunning luxury floral arrangement, premium flowers, elegant design, professional floristry, beautiful color composition'},
  {fileName: 'tax-preparation-advisor.jpg', businessName: 'Summit Tax Advisors', prompt: 'Tax advisor helping client with paperwork, professional office, financial documents, trustworthy expertise, organized workspace'},
  {fileName: 'modern-barbershop-haircut.jpg', businessName: 'LevelUp Barbershop', prompt: 'Modern barbershop, client getting fresh haircut, professional barber, stylish grooming, contemporary salon atmosphere'},
  {fileName: 'carpet-cleaning-service.jpg', businessName: 'AquaClean Carpet Care', prompt: 'Professional carpet cleaning in action, cleaning equipment, deep cleaning process, fresh clean carpet result, professional service'},
  {fileName: 'quality-bicycles-shop.jpg', businessName: 'CityCycle Bike Shop', prompt: 'Quality bicycles displayed in shop, variety of bikes, professional bicycle retail, organized bike store, good lighting'},
  {fileName: 'custom-decorated-cakes.jpg', businessName: 'SweetCrate Bakery', prompt: 'Beautiful custom decorated cakes, artisan bakery work, elegant cake design, delicious appearance, professional bakery photography'},
  {fileName: 'custom-orthotics-footwear.jpg', businessName: 'BrightSteps Orthotics', prompt: 'Custom orthotics and comfortable footwear, medical orthotic inserts, foot health products, professional medical photography'},
  {fileName: 'home-security-system.jpg', businessName: 'EaglePeak Security Systems', prompt: 'Modern home security system installation, smart security camera, professional security equipment, home protection technology'},
  {fileName: 'professional-movers-truck.jpg', businessName: 'Metro Movers', prompt: 'Professional movers loading moving truck, reliable moving service, organized logistics, professional moving company, efficient packing'},
  {fileName: 'coding-bootcamp-students.jpg', businessName: 'ProTutor Coding Bootcamp', prompt: 'Students learning to code on computers, coding bootcamp classroom, programming education, focused learning, tech training environment'},
  {fileName: 'folded-fresh-laundry.jpg', businessName: 'CleanSpark Laundry', prompt: 'Neatly folded, fresh clean laundry, organized clothing, professional laundry service, crisp and clean, bright lighting'},
  {fileName: 'premium-loose-leaf-tea.jpg', businessName: 'GoldenLeaf Tea House', prompt: 'Premium loose-leaf tea display, variety of teas, elegant tea shop, artisan tea selection, warm inviting atmosphere'},
  {fileName: 'strength-training-gym.jpg', businessName: 'SteelCore Fitness Studio', prompt: 'People doing strength training in modern gym, fitness studio, weights and equipment, energetic workout atmosphere, professional gym lighting'},
];

async function generateOne(business: BusinessImage): Promise<boolean> {
  try {
    const enhancedPrompt = enhancePrompt(business.prompt);
    
    const result = await generateText({
      model: 'google/gemini-2.5-flash-image-preview',
      prompt: enhancedPrompt,
      providerOptions: {
        google: { 
          responseModalities: ['TEXT', 'IMAGE'] 
        },
      },
    });
    
    let imageBuffer: Buffer | null = null;
    for (const file of result.files) {
      if (file.mediaType.startsWith('image/')) {
        imageBuffer = Buffer.from(file.uint8Array);
        break;
      }
    }
    
    if (!imageBuffer) {
      return false;
    }
    
    const publicDir = path.join(process.cwd(), 'public');
    const filePath = path.join(publicDir, business.fileName);
    fs.writeFileSync(filePath, imageBuffer);
    
    return true;
  } catch (error) {
    console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function main() {
  console.log('\n🤖 AUTOMATIC Image Generation - All 40 Business Images\n');
  console.log(`Starting in 3 seconds...\n`);
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  let successCount = 0;
  let failedImages: {name: string, error: string}[] = [];
  const startTime = Date.now();
  
  for (let i = 0; i < businesses.length; i++) {
    const business = businesses[i];
    
    if (!business) {
      console.log(`\n⚠️ Skipping undefined business at index ${i}`);
      continue;
    }
    
    console.log(`\n[${ i + 1}/${businesses.length}] ${business.businessName}`);
    process.stdout.write(`   🎨 Generating... `);
    
    const success = await generateOne(business);
    
    if (success) {
      console.log(`✅ Saved: /public/${business.fileName}`);
      successCount++;
    } else {
      console.log(`❌ Failed`);
      failedImages.push({name: business.businessName, error: 'Generation failed'});
    }
    
    // Show progress
    const percent = Math.round((successCount / businesses.length) * 100);
    console.log(`   Progress: ${successCount}/${businesses.length} (${percent}%)`);
  }
  
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000 / 60);
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ GENERATION COMPLETE!`);
  console.log(`   Successfully generated: ${successCount}/${businesses.length} images`);
  console.log(`   Time taken: ${duration} minutes`);
  
  if (failedImages.length > 0) {
    console.log(`\n❌ Failed images (${failedImages.length}):`);
    failedImages.forEach(({name}) => console.log(`   - ${name}`));
  }
  
  console.log(`\n📁 All images saved to: /public/`);
  console.log(`🌐 View homepage at: http://localhost:3000`);
  console.log(`${'='.repeat(70)}\n`);
}

main().catch(console.error);

