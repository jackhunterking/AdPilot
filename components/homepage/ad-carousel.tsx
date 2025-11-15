"use client"

import { AdMockup } from '@/components/ad-mockup'

export function AdCarousel() {
  // 40 realistic business ads with authentic branding
  const exampleAds = [
    // 1. UrbanGlow Dental - Feed
    {
      format: 'feed' as const,
      gradient: 'from-cyan-500 via-blue-500 to-blue-600',
      logoUrl: '/logo-urbanglow-dental.svg',
      brandName: 'UrbanGlow Dental',
      primaryText: 'Brighten your smile with gentle, modern dental care.',
      headline: 'Premium Dental Care',
      description: 'New-patient cleaning packages available.',
      ctaText: 'Learn More',
    },
    // 2. PrimeFit Personal Training - Story
    {
      format: 'story' as const,
      gradient: 'from-red-600 via-red-500 to-orange-500',
      logoUrl: '/logo-primefit-training.svg',
      brandName: 'PrimeFit Personal Training',
      primaryText: 'Transform your body with customized workout plans built for busy professionals.',
      headline: '1-on-1 Personal Training',
      description: 'First session free.',
      ctaText: 'Learn More',
    },
    // 3. FreshNest Cleaning Co. - Feed
    {
      format: 'feed' as const,
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      logoUrl: '/logo-freshnest-cleaning.svg',
      brandName: 'FreshNest Cleaning Co.',
      primaryText: 'Enjoy a spotless home without the stress—trusted cleaners you can count on.',
      headline: 'Home Cleaning Services',
      description: 'Weekly & bi-weekly plans.',
      ctaText: 'Learn More',
    },
    // 4. SparkRide Auto Detailing - Feed
    {
      format: 'feed' as const,
      gradient: 'from-blue-600 via-sky-500 to-blue-500',
      logoUrl: '/logo-sparkride-auto.svg',
      brandName: 'SparkRide Auto Detailing',
      primaryText: 'Restore the shine of your car with our premium detailing treatments.',
      headline: 'Full Car Detailing',
      description: 'Mobile service available.',
      ctaText: 'Learn More',
    },
    // 5. Bloomfield Landscaping - Feed
    {
      format: 'feed' as const,
      gradient: 'from-green-600 via-emerald-500 to-green-500',
      logoUrl: '/logo-bloomfield-landscaping.svg',
      brandName: 'Bloomfield Landscaping',
      primaryText: 'Make your yard summer-ready with expert lawn care and design.',
      headline: 'Landscaping & Yard Care',
      description: 'Free design estimate.',
      ctaText: 'Learn More',
    },
    // 6. TechRevive Phone Repair - Feed
    {
      format: 'feed' as const,
      gradient: 'from-purple-600 via-violet-500 to-purple-500',
      logoUrl: '/logo-techrevive-phone.svg',
      brandName: 'TechRevive Phone Repair',
      primaryText: 'Broken screen? Get fast, same-day phone repair you can trust.',
      headline: 'Phone Repair Service',
      description: 'Most fixes under 30 minutes.',
      ctaText: 'Learn More',
    },
    // 7. Maple & Stone Realtors - Feed
    {
      format: 'feed' as const,
      gradient: 'from-orange-600 via-red-500 to-orange-500',
      logoUrl: '/logo-maple-stone-realtors.svg',
      brandName: 'Maple & Stone Realtors',
      primaryText: 'Find your perfect home with a trusted local real estate expert.',
      headline: 'Buy or Sell With Confidence',
      description: 'Personalized market guidance.',
      ctaText: 'Learn More',
    },
    // 8. Lifted Meals Prep Service - Feed
    {
      format: 'feed' as const,
      gradient: 'from-emerald-600 via-green-500 to-teal-500',
      logoUrl: '/logo-lifted-meals.svg',
      brandName: 'Lifted Meals Prep Service',
      primaryText: 'Healthy, chef-crafted meals delivered fresh to your door weekly.',
      headline: 'Meal Prep Made Easy',
      description: 'Fresh menu every week.',
      ctaText: 'Learn More',
    },
    // 9. LuxeSkin Aesthetics - Story
    {
      format: 'story' as const,
      gradient: 'from-pink-500 via-rose-500 to-pink-600',
      logoUrl: '/logo-luxeskin-aesthetics.svg',
      brandName: 'LuxeSkin Aesthetics',
      primaryText: 'Reveal glowing skin with our customized facial and skincare treatments.',
      headline: 'Advanced Facial Treatments',
      description: 'New client promos.',
      ctaText: 'Learn More',
    },
    // 10. Paw Haven Grooming - Feed
    {
      format: 'feed' as const,
      gradient: 'from-amber-500 via-orange-500 to-yellow-500',
      logoUrl: '/logo-pawhaven-grooming.svg',
      brandName: 'Paw Haven Grooming',
      primaryText: 'Keep your pet looking fresh and healthy with gentle grooming specialists.',
      headline: 'Pet Grooming Services',
      description: 'Book online easily.',
      ctaText: 'Learn More',
    },
    // 11. The Interior Loft - Feed
    {
      format: 'feed' as const,
      gradient: 'from-indigo-600 via-blue-500 to-purple-500',
      logoUrl: '/logo-interior-loft.svg',
      brandName: 'The Interior Loft',
      primaryText: 'Refresh your space with professional interior styling made simple.',
      headline: 'Interior Design Services',
      description: 'Virtual consult available.',
      ctaText: 'Learn More',
    },
    // 12. BluePeak Roofing - Feed
    {
      format: 'feed' as const,
      gradient: 'from-sky-500 via-blue-500 to-cyan-600',
      logoUrl: '/logo-bluepeak-roofing.svg',
      brandName: 'BluePeak Roofing',
      primaryText: 'Protect your home with durable, long-lasting roofing solutions.',
      headline: 'Roofing Experts',
      description: 'Free inspection.',
      ctaText: 'Learn More',
    },
    // 13. BrightPath Tutoring - Feed
    {
      format: 'feed' as const,
      gradient: 'from-teal-500 via-cyan-500 to-blue-500',
      logoUrl: '/logo-brightpath-tutoring.svg',
      brandName: 'BrightPath Tutoring',
      primaryText: 'Help your child excel with personalized tutoring in math, science, and English.',
      headline: 'Private Tutoring',
      description: 'Flexible scheduling.',
      ctaText: 'Learn More',
    },
    // 14. ZenBody Massage Studio - Feed
    {
      format: 'feed' as const,
      gradient: 'from-purple-500 via-violet-500 to-purple-600',
      logoUrl: '/logo-zenbody-massage.svg',
      brandName: 'ZenBody Massage Studio',
      primaryText: 'Melt away stress with therapeutic massage treatments tailored to your needs.',
      headline: 'Relax & Rejuvenate',
      description: 'Intro massage available.',
      ctaText: 'Learn More',
    },
    // 15. SilverSpoon Catering - Feed
    {
      format: 'feed' as const,
      gradient: 'from-slate-600 via-gray-500 to-slate-500',
      logoUrl: '/logo-silverspoon-catering.svg',
      brandName: 'SilverSpoon Catering',
      primaryText: 'Make your next event unforgettable with gourmet catering your guests will love.',
      headline: 'Event Catering',
      description: 'Weddings, parties & more.',
      ctaText: 'Learn More',
    },
    // 16. DriveRight Instructors - Feed
    {
      format: 'feed' as const,
      gradient: 'from-red-500 via-orange-500 to-red-600',
      logoUrl: '/logo-driveright-instructors.svg',
      brandName: 'DriveRight Instructors',
      primaryText: 'Learn to drive with patient, certified instructors recommended by students.',
      headline: 'Driving Lessons',
      description: 'Packages available.',
      ctaText: 'Learn More',
    },
    // 17. FitFuel Smoothie Bar - Story
    {
      format: 'story' as const,
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      logoUrl: '/logo-fitfuel-smoothie.svg',
      brandName: 'FitFuel Smoothie Bar',
      primaryText: 'Fuel your day with protein-packed smoothies made from real ingredients.',
      headline: 'Healthy Smoothies',
      description: 'New seasonal flavours.',
      ctaText: 'Learn More',
    },
    // 18. AquaPure Pool Services - Feed
    {
      format: 'feed' as const,
      gradient: 'from-cyan-500 via-blue-400 to-sky-500',
      logoUrl: '/logo-aquapure-pool.svg',
      brandName: 'AquaPure Pool Services',
      primaryText: 'Enjoy a crystal-clear pool all season with reliable cleaning experts.',
      headline: 'Pool Maintenance',
      description: 'Weekly service options.',
      ctaText: 'Learn More',
    },
    // 19. CozyNest AirBnB Management - Feed
    {
      format: 'feed' as const,
      gradient: 'from-rose-500 via-pink-500 to-red-500',
      logoUrl: '/logo-cozynest-airbnb.svg',
      brandName: 'CozyNest AirBnB Management',
      primaryText: 'Earn more from your rental with full-service Airbnb management.',
      headline: 'Airbnb Hosting Support',
      description: 'No long-term contracts.',
      ctaText: 'Learn More',
    },
    // 20. Thrive Chiropractic - Feed
    {
      format: 'feed' as const,
      gradient: 'from-teal-600 via-cyan-500 to-teal-500',
      logoUrl: '/logo-thrive-chiropractic.svg',
      brandName: 'Thrive Chiropractic',
      primaryText: 'Relieve back pain and improve mobility with gentle chiropractic care.',
      headline: 'Chiropractic Treatments',
      description: 'New patient exam.',
      ctaText: 'Learn More',
    },
    // 21. AutoGuard Mechanics - Feed
    {
      format: 'feed' as const,
      gradient: 'from-slate-600 via-gray-500 to-slate-500',
      logoUrl: '/logo-autoguard-mechanics.svg',
      brandName: 'AutoGuard Mechanics',
      primaryText: 'Keep your vehicle running safely with expert, honest auto repair.',
      headline: 'Trusted Auto Repair',
      description: 'Fair pricing guaranteed.',
      ctaText: 'Learn More',
    },
    // 22. Meadow Kids Montessori - Feed
    {
      format: 'feed' as const,
      gradient: 'from-orange-400 via-amber-500 to-yellow-500',
      logoUrl: '/logo-meadow-kids-montessori.svg',
      brandName: 'Meadow Kids Montessori',
      primaryText: 'Give your child a head start with a nurturing Montessori education.',
      headline: 'Montessori Enrolment',
      description: 'Limited spots available.',
      ctaText: 'Learn More',
    },
    // 23. BoldBrew Coffee Co. - Story
    {
      format: 'story' as const,
      gradient: 'from-amber-900 via-yellow-800 to-orange-800',
      logoUrl: '/logo-boldbrew-coffee.svg',
      brandName: 'BoldBrew Coffee Co.',
      primaryText: 'Enjoy barista-quality coffee at home with our fresh roasted beans.',
      headline: 'Fresh Coffee Delivered',
      description: 'Monthly subscriptions.',
      ctaText: 'Learn More',
    },
    // 24. ShinePro Window Cleaning - Feed
    {
      format: 'feed' as const,
      gradient: 'from-sky-400 via-blue-400 to-cyan-400',
      logoUrl: '/logo-shinepro-window.svg',
      brandName: 'ShinePro Window Cleaning',
      primaryText: 'Get spotless, streak-free windows for a brighter home.',
      headline: 'Window Cleaning',
      description: 'Affordable packages.',
      ctaText: 'Learn More',
    },
    // 25. Horizon Solar Installers - Feed
    {
      format: 'feed' as const,
      gradient: 'from-yellow-500 via-amber-500 to-orange-500',
      logoUrl: '/logo-horizon-solar.svg',
      brandName: 'Horizon Solar Installers',
      primaryText: 'Cut your energy bills with clean, reliable solar solutions.',
      headline: 'Switch to Solar',
      description: 'Free home assessment.',
      ctaText: 'Learn More',
    },
    // 26. Peak Performance Coaching - Feed
    {
      format: 'feed' as const,
      gradient: 'from-indigo-600 via-blue-500 to-indigo-500',
      logoUrl: '/logo-peak-performance-coaching.svg',
      brandName: 'Peak Performance Coaching',
      primaryText: 'Grow your business with actionable coaching tailored to your goals.',
      headline: 'Business Coaching',
      description: 'Strategy call available.',
      ctaText: 'Learn More',
    },
    // 27. CraftedStone Renovations - Feed
    {
      format: 'feed' as const,
      gradient: 'from-teal-700 via-cyan-600 to-teal-600',
      logoUrl: '/logo-craftedstone-renovations.svg',
      brandName: 'CraftedStone Renovations',
      primaryText: 'Transform your kitchen or bathroom with expert renovation specialists.',
      headline: 'Home Renovations',
      description: 'Free quote.',
      ctaText: 'Learn More',
    },
    // 28. VelvetBloom Florist - Story
    {
      format: 'story' as const,
      gradient: 'from-pink-600 via-rose-500 to-pink-500',
      logoUrl: '/logo-velvetbloom-florist.svg',
      brandName: 'VelvetBloom Florist',
      primaryText: 'Stunning floral designs crafted for every moment and occasion.',
      headline: 'Luxury Floral Arrangements',
      description: 'Fresh daily delivery.',
      ctaText: 'Learn More',
    },
    // 29. Summit Tax Advisors - Feed
    {
      format: 'feed' as const,
      gradient: 'from-blue-800 via-indigo-700 to-blue-700',
      logoUrl: '/logo-summit-tax.svg',
      brandName: 'Summit Tax Advisors',
      primaryText: 'Get stress-free tax preparation with experienced advisors.',
      headline: 'Tax Filing Help',
      description: 'Simple, affordable service.',
      ctaText: 'Learn More',
    },
    // 30. LevelUp Barbershop - Story
    {
      format: 'story' as const,
      gradient: 'from-red-600 via-rose-600 to-red-700',
      logoUrl: '/logo-levelup-barbershop.svg',
      brandName: 'LevelUp Barbershop',
      primaryText: 'Look sharp with premium barber services designed for modern men.',
      headline: 'Fresh Cuts & Styling',
      description: 'Book online.',
      ctaText: 'Learn More',
    },
    // 31. AquaClean Carpet Care - Feed
    {
      format: 'feed' as const,
      gradient: 'from-blue-600 via-sky-500 to-blue-500',
      logoUrl: '/logo-aquaclean-carpet.svg',
      brandName: 'AquaClean Carpet Care',
      primaryText: 'Bring your carpets back to life with professional deep cleaning.',
      headline: 'Carpet Cleaning',
      description: 'Same-day service.',
      ctaText: 'Learn More',
    },
    // 32. CityCycle Bike Shop - Feed
    {
      format: 'feed' as const,
      gradient: 'from-emerald-600 via-green-500 to-emerald-500',
      logoUrl: '/logo-citycycle-bike.svg',
      brandName: 'CityCycle Bike Shop',
      primaryText: 'Discover durable bikes and accessories built for daily commuting.',
      headline: 'Bikes for Every Rider',
      description: 'Shop local.',
      ctaText: 'Learn More',
    },
    // 33. SweetCrate Bakery - Story
    {
      format: 'story' as const,
      gradient: 'from-pink-400 via-rose-400 to-pink-500',
      logoUrl: '/logo-sweetcrate-bakery.svg',
      brandName: 'SweetCrate Bakery',
      primaryText: 'Treat yourself to handcrafted cakes and pastries made fresh daily.',
      headline: 'Custom Cakes',
      description: 'Pickup & delivery.',
      ctaText: 'Learn More',
    },
    // 34. BrightSteps Orthotics - Feed
    {
      format: 'feed' as const,
      gradient: 'from-cyan-600 via-blue-500 to-sky-500',
      logoUrl: '/logo-brightsteps-orthotics.svg',
      brandName: 'BrightSteps Orthotics',
      primaryText: 'Experience pain-free walking with custom orthotics designed for comfort.',
      headline: 'Foot Pain Relief',
      description: 'Book a fitting.',
      ctaText: 'Learn More',
    },
    // 35. EaglePeak Security Systems - Feed
    {
      format: 'feed' as const,
      gradient: 'from-gray-800 via-slate-700 to-gray-700',
      logoUrl: '/logo-eaglepeak-security.svg',
      brandName: 'EaglePeak Security Systems',
      primaryText: 'Protect your home with smart security and 24/7 monitoring.',
      headline: 'Home Security Systems',
      description: 'Free equipment quote.',
      ctaText: 'Learn More',
    },
    // 36. Metro Movers - Feed
    {
      format: 'feed' as const,
      gradient: 'from-orange-600 via-red-500 to-orange-500',
      logoUrl: '/logo-metro-movers.svg',
      brandName: 'Metro Movers',
      primaryText: 'Move with confidence—fast, reliable movers at fair prices.',
      headline: 'Professional Moving',
      description: 'Local & long-distance.',
      ctaText: 'Learn More',
    },
    // 37. ProTutor Coding Bootcamp - Feed
    {
      format: 'feed' as const,
      gradient: 'from-purple-700 via-violet-600 to-purple-600',
      logoUrl: '/logo-protutor-coding.svg',
      brandName: 'ProTutor Coding Bootcamp',
      primaryText: 'Learn real coding skills and build projects from day one.',
      headline: 'Beginner-Friendly Coding',
      description: 'Evening classes available.',
      ctaText: 'Learn More',
    },
    // 38. CleanSpark Laundry - Feed
    {
      format: 'feed' as const,
      gradient: 'from-teal-600 via-cyan-500 to-teal-500',
      logoUrl: '/logo-cleanspark-laundry.svg',
      brandName: 'CleanSpark Laundry',
      primaryText: 'Laundry done for you—fast pickup and fresh delivery.',
      headline: 'Laundry Service',
      description: 'Weekly plans.',
      ctaText: 'Learn More',
    },
    // 39. GoldenLeaf Tea House - Feed
    {
      format: 'feed' as const,
      gradient: 'from-yellow-700 via-amber-600 to-yellow-600',
      logoUrl: '/logo-goldenleaf-tea.svg',
      brandName: 'GoldenLeaf Tea House',
      primaryText: 'Discover rare teas sourced from artisans around the world.',
      headline: 'Premium Loose-Leaf Tea',
      description: 'Shop blends & sets.',
      ctaText: 'Learn More',
    },
    // 40. SteelCore Fitness Studio - Story
    {
      format: 'story' as const,
      gradient: 'from-zinc-900 via-gray-800 to-zinc-800',
      logoUrl: '/logo-steelcore-fitness.svg',
      brandName: 'SteelCore Fitness Studio',
      primaryText: 'Join a results-driven fitness community with real accountability.',
      headline: 'Strength Training Classes',
      description: 'Try your first class.',
      ctaText: 'Learn More',
    },
  ]

  // Duplicate ads for seamless infinite loop
  const duplicatedAds = [...exampleAds, ...exampleAds]

  return (
    <section className="w-full py-16 overflow-hidden bg-muted/30">
      <div className="max-w-7xl mx-auto mb-8 px-6">
        <h2 className="text-3xl font-bold text-center mb-3">
          See What&apos;s Possible
        </h2>
        <p className="text-center text-muted-foreground">
          Real ad examples created with AI in minutes
        </p>
      </div>
      
      <div className="relative">
        <div className="flex animate-infinite-scroll hover:pause">
          {duplicatedAds.map((ad, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-80 mx-4"
            >
              <AdMockup {...ad} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

