/**
 * Feature: Interactive Homepage Image Generation Script
 * Purpose: Generate all 40 business images one at a time with verification
 * Usage: npm run generate-homepage-images
 */

import * as readline from 'readline';

interface BusinessImage {
  fileName: string;
  prompt: string;
  businessName: string;
}

// All 40 business images with their requirements
const businessImages: BusinessImage[] = [
  {
    fileName: 'dental-office-smile.jpg',
    businessName: 'UrbanGlow Dental',
    prompt: 'Professional dental office with patient smiling after treatment, bright and clean, modern interior, natural lighting, professional photography'
  },
  {
    fileName: 'personal-trainer-workout.jpg',
    businessName: 'PrimeFit Personal Training',
    prompt: 'Personal trainer helping client with exercise in modern gym, motivational atmosphere, professional fitness training, natural gym lighting'
  },
  {
    fileName: 'clean-home-interior.jpg',
    businessName: 'FreshNest Cleaning Co.',
    prompt: 'Spotless, organized home interior, clean living room, fresh and tidy, bright natural light, professional cleaning result'
  },
  {
    fileName: 'detailed-shiny-car.jpg',
    businessName: 'SparkRide Auto Detailing',
    prompt: 'Shiny, freshly detailed luxury car exterior, water droplets on hood, professional car detailing, high-end automobile, studio lighting'
  },
  {
    fileName: 'beautiful-landscaped-yard.jpg',
    businessName: 'Bloomfield Landscaping',
    prompt: 'Professional landscaped backyard with lush green grass, flower beds, stone pathway, summer day, real estate photography quality'
  },
  {
    fileName: 'phone-repair-service.jpg',
    businessName: 'TechRevive Phone Repair',
    prompt: 'Technician repairing smartphone, professional phone repair shop, precision work with tools, technical expertise, clean workspace'
  },
  {
    fileName: 'beautiful-home-exterior.jpg',
    businessName: 'Maple & Stone Realtors',
    prompt: 'Attractive residential home exterior, modern house, well-maintained property, beautiful curb appeal, professional real estate photography'
  },
  {
    fileName: 'meal-prep-containers.jpg',
    businessName: 'Lifted Meals Prep Service',
    prompt: 'Healthy meal prep containers with fresh food, colorful vegetables, protein, balanced nutrition, professional food photography'
  },
  {
    fileName: 'facial-treatment-spa.jpg',
    businessName: 'LuxeSkin Aesthetics',
    prompt: 'Facial skincare treatment in spa setting, professional esthetician, relaxing atmosphere, luxury spa experience, serene lighting'
  },
  {
    fileName: 'groomed-happy-dog.jpg',
    businessName: 'Paw Haven Grooming',
    prompt: 'Well-groomed, happy dog after grooming session, fluffy and clean, professional pet grooming result, bright studio lighting'
  },
  {
    fileName: 'modern-interior-design.jpg',
    businessName: 'The Interior Loft',
    prompt: 'Stylish, modern interior design living room, contemporary furniture, tasteful decor, professional interior styling, natural daylight'
  },
  {
    fileName: 'professional-roofing-work.jpg',
    businessName: 'BluePeak Roofing',
    prompt: 'Roofers working on residential roof, professional roofing installation, safety equipment, quality craftsmanship, clear blue sky'
  },
  {
    fileName: 'student-tutoring-session.jpg',
    businessName: 'BrightPath Tutoring',
    prompt: 'Tutor helping student with studies, focused learning environment, educational materials, supportive teaching, bright study space'
  },
  {
    fileName: 'massage-therapy-session.jpg',
    businessName: 'ZenBody Massage Studio',
    prompt: 'Relaxing massage therapy treatment, professional massage therapist, serene spa atmosphere, calming lighting, wellness and relaxation'
  },
  {
    fileName: 'gourmet-catering-food.jpg',
    businessName: 'SilverSpoon Catering',
    prompt: 'Beautiful gourmet catered food display, elegant presentation, variety of dishes, professional catering setup, appetizing lighting'
  },
  {
    fileName: 'driving-lesson-car.jpg',
    businessName: 'DriveRight Instructors',
    prompt: 'Instructor teaching student to drive, dual-control car, learning environment, professional driving instruction, safe practice'
  },
  {
    fileName: 'healthy-smoothie-bowls.jpg',
    businessName: 'FitFuel Smoothie Bar',
    prompt: 'Colorful, healthy smoothies and bowls, fresh ingredients, vibrant presentation, nutritious and appetizing, natural food photography'
  },
  {
    fileName: 'crystal-clear-pool.jpg',
    businessName: 'AquaPure Pool Services',
    prompt: 'Crystal clear swimming pool, well-maintained, sparkling blue water, clean pool deck, professional pool service result, sunny day'
  },
  {
    fileName: 'beautiful-airbnb-interior.jpg',
    businessName: 'CozyNest AirBnB Management',
    prompt: 'Cozy, inviting Airbnb rental space, comfortable bedroom or living room, welcoming atmosphere, professional hospitality photography'
  },
  {
    fileName: 'chiropractic-adjustment.jpg',
    businessName: 'Thrive Chiropractic',
    prompt: 'Chiropractor performing adjustment on patient, professional chiropractic care, clinical setting, healthcare expertise, professional lighting'
  },
  {
    fileName: 'auto-mechanic-work.jpg',
    businessName: 'AutoGuard Mechanics',
    prompt: 'Mechanic working under car hood, professional auto repair shop, technical expertise, quality service, well-equipped garage'
  },
  {
    fileName: 'montessori-classroom-kids.jpg',
    businessName: 'Meadow Kids Montessori',
    prompt: 'Children in Montessori classroom learning, engaged students, educational materials, nurturing environment, bright natural classroom'
  },
  {
    fileName: 'fresh-coffee-beans-brewing.jpg',
    businessName: 'BoldBrew Coffee Co.',
    prompt: 'Fresh coffee beans and brewing equipment, artisan coffee roasting, rich dark beans, professional coffee photography, warm tones'
  },
  {
    fileName: 'clean-sparkling-windows.jpg',
    businessName: 'ShinePro Window Cleaning',
    prompt: 'Spotless, streak-free windows, crystal clear glass, clean home exterior, professional window cleaning result, bright daylight'
  },
  {
    fileName: 'solar-panels-installation.jpg',
    businessName: 'Horizon Solar Installers',
    prompt: 'Solar panels being installed on residential roof, renewable energy, professional installation, modern solar technology, clear sky'
  },
  {
    fileName: 'business-coaching-session.jpg',
    businessName: 'Peak Performance Coaching',
    prompt: 'Business coach with client, strategy session, professional office setting, leadership development, collaborative discussion'
  },
  {
    fileName: 'kitchen-bathroom-renovation.jpg',
    businessName: 'CraftedStone Renovations',
    prompt: 'Beautiful renovated kitchen or bathroom, modern fixtures, quality craftsmanship, stunning transformation, professional renovation photography'
  },
  {
    fileName: 'luxury-flower-arrangement.jpg',
    businessName: 'VelvetBloom Florist',
    prompt: 'Stunning luxury floral arrangement, premium flowers, elegant design, professional floristry, beautiful color composition'
  },
  {
    fileName: 'tax-preparation-advisor.jpg',
    businessName: 'Summit Tax Advisors',
    prompt: 'Tax advisor helping client with paperwork, professional office, financial documents, trustworthy expertise, organized workspace'
  },
  {
    fileName: 'modern-barbershop-haircut.jpg',
    businessName: 'LevelUp Barbershop',
    prompt: 'Modern barbershop, client getting fresh haircut, professional barber, stylish grooming, contemporary salon atmosphere'
  },
  {
    fileName: 'carpet-cleaning-service.jpg',
    businessName: 'AquaClean Carpet Care',
    prompt: 'Professional carpet cleaning in action, cleaning equipment, deep cleaning process, fresh clean carpet result, professional service'
  },
  {
    fileName: 'quality-bicycles-shop.jpg',
    businessName: 'CityCycle Bike Shop',
    prompt: 'Quality bicycles displayed in shop, variety of bikes, professional bicycle retail, organized bike store, good lighting'
  },
  {
    fileName: 'custom-decorated-cakes.jpg',
    businessName: 'SweetCrate Bakery',
    prompt: 'Beautiful custom decorated cakes, artisan bakery work, elegant cake design, delicious appearance, professional bakery photography'
  },
  {
    fileName: 'custom-orthotics-footwear.jpg',
    businessName: 'BrightSteps Orthotics',
    prompt: 'Custom orthotics and comfortable footwear, medical orthotic inserts, foot health products, professional medical photography'
  },
  {
    fileName: 'home-security-system.jpg',
    businessName: 'EaglePeak Security Systems',
    prompt: 'Modern home security system installation, smart security camera, professional security equipment, home protection technology'
  },
  {
    fileName: 'professional-movers-truck.jpg',
    businessName: 'Metro Movers',
    prompt: 'Professional movers loading moving truck, reliable moving service, organized logistics, professional moving company, efficient packing'
  },
  {
    fileName: 'coding-bootcamp-students.jpg',
    businessName: 'ProTutor Coding Bootcamp',
    prompt: 'Students learning to code on computers, coding bootcamp classroom, programming education, focused learning, tech training environment'
  },
  {
    fileName: 'folded-fresh-laundry.jpg',
    businessName: 'CleanSpark Laundry',
    prompt: 'Neatly folded, fresh clean laundry, organized clothing, professional laundry service, crisp and clean, bright lighting'
  },
  {
    fileName: 'premium-loose-leaf-tea.jpg',
    businessName: 'GoldenLeaf Tea House',
    prompt: 'Premium loose-leaf tea display, variety of teas, elegant tea shop, artisan tea selection, warm inviting atmosphere'
  },
  {
    fileName: 'strength-training-gym.jpg',
    businessName: 'SteelCore Fitness Studio',
    prompt: 'People doing strength training in modern gym, fitness studio, weights and equipment, energetic workout atmosphere, professional gym lighting'
  },
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function generateImage(business: BusinessImage): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3000/api/generate-homepage-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(business),
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ ${result.message}`);
      console.log(`   View at: http://localhost:3000${result.imageUrl}`);
      return true;
    } else {
      console.log(`❌ Error: ${result.message}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log('   Make sure the dev server is running (npm run dev)');
    return false;
  }
}

async function main() {
  console.log('\n🎨 Homepage Business Image Generator\n');
  console.log('This script will generate all 40 business images one at a time.');
  console.log('You can verify each image before continuing to the next one.\n');
  console.log('Make sure your dev server is running: npm run dev\n');

  const startAnswer = await question('Ready to start? (y/n): ');
  if (startAnswer.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    rl.close();
    return;
  }

  let successCount = 0;
  let skipCount = 0;

  for (let i = 0; i < businessImages.length; i++) {
    const business = businessImages[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Generating ${i + 1}/${businessImages.length}: ${business.fileName}`);
    console.log(`Business: ${business.businessName}`);
    console.log(`${'='.repeat(60)}\n`);

    const success = await generateImage(business);

    if (success) {
      successCount++;
      
      if (i < businessImages.length - 1) {
        const answer = await question('\nContinue to next image? (y=yes, n=skip, q=quit): ');
        
        if (answer.toLowerCase() === 'q') {
          console.log('\nStopping generation...');
          break;
        } else if (answer.toLowerCase() === 'n') {
          console.log('Skipping to next...');
          skipCount++;
        }
      }
    } else {
      const retry = await question('\nRetry this image? (y/n): ');
      if (retry.toLowerCase() === 'y') {
        i--; // Retry the same image
        continue;
      } else {
        skipCount++;
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Generation Complete!');
  console.log(`   Successfully generated: ${successCount}/${businessImages.length} images`);
  if (skipCount > 0) {
    console.log(`   Skipped: ${skipCount} images`);
  }
  console.log(`${'='.repeat(60)}\n`);

  rl.close();
}

main().catch(console.error);

