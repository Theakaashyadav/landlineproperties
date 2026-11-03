(function () {
  'use strict';

  // Researched 2 November 2026. This project directory is independent of unit
  // inventory in the CMS. Unknown prices and specifications are left unset.
  const projects = [
    {
      id: 'godrej-dmic', slug: 'godrej-dmic', name: 'Godrej GBC',
      city: 'Greater Noida', locality: 'DMIC Integrated Township',
      developer: 'Godrej Properties', property_type: 'Apartment',
      configuration: 'Configuration on request', bhk_options: [],
      project_status: 'Upcoming', starting_price: null, price_label: 'Price on request',
      short_description: 'A proposed Godrej residential development in the DMIC Integrated Township, Greater Noida. Launch details are awaited.',
      description: 'Godrej GBC is listed here for the proposed Godrej Properties residential development on a 23.2-acre site in the DMIC Integrated Township, Greater Noida. Request the latest approved plans, configurations, launch pricing and possession details.',
      amenities: [],
      image: '/image/projects/godrej-gbc-moneycontrol.jpg',
      image_alt: 'Godrej Properties logo for Godrej GBC',
      image_note: 'Godrej Properties logo',
      image_source: 'https://images.moneycontrol.com/static-mcnews/2020/02/Godrej-Properties-770x433.jpg?impolicy=website&width=770&height=431',
      source_url: 'https://www.business-standard.com/markets/capital-market-news/godrej-properties-wins-bid-for-23-2-acre-land-parcel-in-greater-noida-126060100886_1.html',
      source_label: 'Godrej land-acquisition report',
      search_aliases: ['Godrej GBC', 'Godrej DMIC'],
      detail_note: 'The developer logo is shown for identification. Confirm the registered project name, approved plans and current availability with the developer.'
    },
    {
      id: 'hero-homes-leafsong-retreat', slug: 'hero-homes-leafsong-retreat', name: 'Hero Homes Leafsong Retreat',
      city: 'Greater Noida', locality: 'Sector MU',
      developer: 'Hero Realty', property_type: 'Apartment',
      configuration: '3 BHK', bhk_options: ['3 BHK'],
      project_status: 'New Launch', starting_price: null, price_label: 'Price on request',
      short_description: 'Resort-inspired 3 BHK residences in Sector MU, Greater Noida, with landscaped pedestrian spaces, a clubhouse and wellness amenities.',
      description: 'Leafsong Retreat by Hero Homes offers 3-bedroom residences in Sector MU, Greater Noida. The developer lists sizes from 153.84 to 212.68 sq. m. across three 30-storey towers. Landscaped pedestrian spaces and an integrated clubhouse bring together recreation and wellness, with a gym, meditation centre, spa, children’s play areas and a library.',
      amenities: ['Clubhouse', 'Gym', 'Meditation centre', 'Spa & salon', 'Children’s play areas', 'Library & art corner', 'Restaurant'],
      image: '/image/projects/hero-homes-leafsong-retreat-02.webp',
      image_alt: 'Official developer exterior rendering of Leafsong Retreat by Hero Homes, Sector MU, Greater Noida',
      image_note: 'Developer artist impression',
      image_source: 'https://www.herohomes.in/api/image?path=%2Fuploads%2FCam_02_Worms_Eye_Cam_Morning_95950d1088.webp',
      source_url: 'https://www.herohomes.in/projects/apartments/greater-noida-uttar-pradesh/leafsong-retreat-sec-mu',
      source_label: 'Leafsong Retreat official project page',
      detail_note: 'Developer-listed RERA: UPRERAPRJ414014/10/2026. Launched 9 October 2026. Sizes are published in square metres; request the current area statement and availability.'
    },
    {
      id: 'gulmohar-sector-135', slug: 'gulmohar-sector-135', name: 'Gulmohar Studios',
      city: 'Noida', locality: 'Sector 135',
      developer: '', property_type: 'Apartment',
      configuration: 'Furnished studios', bhk_options: ['Studio'],
      project_status: 'Ready to Move', starting_price: null, price_label: 'Price on request',
      area_min: 550, area_max: 550, furnishing: 'Fully Furnished',
      short_description: 'Furnished studio residences in Sector 135, Noida, close to the Noida–Greater Noida Expressway and office districts.',
      description: 'Gulmohar Studios is a furnished studio development in Sector 135, Noida. Public property listings describe approximately 550 sq. ft. studios with a kitchen and combined living and sleeping space. Its location serves the office and residential neighbourhoods along the Noida–Greater Noida Expressway.',
      amenities: [],
      image: '/image/projects/gulmohar-sector-135-exterior.jpg',
      image_alt: 'Gulmohar Studios building exterior in Sector 135, Noida',
      image_note: 'Building exterior',
      image_source: '/image/projects/gulmohar-sector-135-exterior.jpg',
      source_url: 'https://realestate.aajneeti.social/project/gulmohar-noida',
      source_label: 'Gulmohar Sector 135 project listing',
      detail_note: 'Details and ready-to-move status are reported by property listings. Confirm the promoter, approvals, exact unit area and availability.'
    },
    {
      id: 'ace-arte-sector-150', slug: 'ace-arte-sector-150', name: 'ACE ARTE',
      city: 'Noida', locality: 'Sector 150',
      developer: 'ACE Group', property_type: 'Apartment',
      configuration: '3 & 4 BHK', bhk_options: ['3 BHK', '4 BHK'],
      project_status: 'New Launch', starting_price: null, price_label: 'Price on request',
      short_description: 'Neo-classical 3 and 4 BHK residences in Sector 150, with landscaped grounds and a signature clubhouse, designed by Hafeez Contractor.',
      description: 'ACE ARTE is an ACE Group residential project in Sector 150, Noida. Designed by architect Hafeez Contractor, it offers 3 and 4 BHK residences across approximately 15 acres. The developer describes landscaped grounds, extensive open spaces and an approximately 50,000 sq. ft. clubhouse.',
      amenities: ['Landscaped gardens', 'Clubhouse', 'Swimming pool', 'Fitness centre', 'Sports facilities'],
      image: '/image/projects/ace-arte-02.webp',
      image_alt: 'Developer architectural rendering of ACE ARTE, Sector 150, Noida',
      image_note: 'Developer artist impression',
      image_source: 'https://www.acearte.in/images/gallery-n1.webp',
      source_url: 'https://www.acearte.in/', source_label: 'ACE ARTE official project page',
      detail_note: 'Developer-listed RERA: UPRERAPRJ528653/07/2026. Project visuals are artist impressions. Request current pricing and approved specifications.'
    },
    {
      id: 'corbett-eye', slug: 'corbett-eye', name: 'Corbett Eye', region: 'uttarakhand',
      city: 'Ramnagar', locality: 'NH-309, Jim Corbett region',
      developer: 'GlobalBirth Developers', property_type: 'Plot',
      configuration: 'Residential plots', bhk_options: [],
      project_status: 'Plotted development', starting_price: null, price_label: 'Price on request',
      short_description: 'An 8.5-acre plotted development in Ramnagar, with NH-309 connectivity, landscaped spaces and access to the Jim Corbett region.',
      description: 'Corbett Eye is an 8.5-acre residential plotted development by GlobalBirth Developers in Ramnagar, Uttarakhand. The developer describes a planned community with internal roads, landscaped areas and township infrastructure, connected to NH-309 and the wider Jim Corbett region. Contact the team for the current plot sizes and site-visit arrangements.',
      amenities: ['Internal roads', 'Landscaped areas', 'Clubhouse', 'Gated access', 'Security'],
      image: '/image/projects/corbett-eye-layout.webp',
      image_alt: 'Published Corbett Eye plot layout and entrance rendering, Ramnagar',
      image_note: 'Published project layout',
      image_source: 'https://pranshiinfra.in/wp-content/uploads/2025/03/MAP_page-0001-1024x701-1.webp',
      source_url: 'https://globalbirthdevelopers.com/corbett-eye.html',
      source_label: 'Corbett Eye developer project page',
      search_aliases: ['Corbett Eye Ramnagar Jim Corbett plots'],
      detail_note: 'The published layout is illustrative. Request the current plot map, sizes, approvals and availability.'
    },
    {
      id: 'shubh-kadam', slug: 'shubh-kadam', name: 'Shubh Kadam', region: 'uttarakhand',
      city: 'Ramnagar', locality: 'Dhela Gate, Jim Corbett region',
      developer: 'GlobalBirth Developers', property_type: 'Resort residences',
      property_types: ['Apartment', 'Villa', 'Commercial'],
      configuration: 'Studios & duplex cottages', bhk_options: ['Studio'],
      project_status: 'Resort development', starting_price: null, price_label: 'Price on request',
      short_description: 'Studios and duplex cottages in the Dhela Gate belt near Jim Corbett, with a resort setting, pool, restaurant and landscaped grounds.',
      description: 'Shubh Kadam is a GlobalBirth Developers resort project in Ramnagar, near the Dhela Gate side of the Jim Corbett region. Its accommodation includes studios and duplex cottages. The developer presents a pool, restaurant, landscaped park, clubhouse and indoor recreation facilities within the resort setting.',
      amenities: ['Swimming pool', 'Restaurant', 'Landscaped park', 'Clubhouse', 'Indoor games'],
      image: '/image/projects/shubh-kadam-resort.jpg',
      image_alt: 'Shubh Kadam resort building and swimming pool from the developer gallery',
      image_note: 'Developer resort photograph',
      image_source: 'https://globalbirthdevelopers.com/images/shubh-kadam/resort-exterior-day.jpg',
      source_url: 'https://globalbirthdevelopers.com/Shubh-Kadam-Park-Resort.html',
      source_label: 'Shubh Kadam developer project page',
      search_aliases: ['Shubhkadam Subhkadam Shubhkdam Shubh Kadam Nirvana'],
      detail_note: 'Request the current accommodation specifications, ownership terms and unit availability from the project team.'
    },
    {
      id: 'shubh-kadam-2', slug: 'shubh-kadam-2', name: 'Shubh Kadam 2.0', region: 'uttarakhand',
      city: 'Ramnagar', locality: 'Jim Corbett tourism belt',
      developer: 'GlobalBirth Developers', property_type: 'Resort residences',
      property_types: ['Apartment', 'Villa', 'Commercial'],
      configuration: 'Studios & duplex cottages', bhk_options: ['Studio'],
      project_status: 'Planned development', starting_price: null, price_label: 'Price on request',
      short_description: 'A separate resort development in Ramnagar, with planned studio accommodation, duplex cottages, landscaped courts and shared leisure spaces.',
      description: 'Shubh Kadam 2.0 is a GlobalBirth Developers hospitality development in Ramnagar, Uttarakhand. Planned studio accommodation and duplex cottages are arranged around landscaped courts and shared outdoor spaces. The developer’s project visuals show the entrance, pool, lawns, restaurant and accommodation buildings.',
      amenities: ['Planned swimming pool', 'Landscaped lawns', 'Restaurant', 'Pedestrian courts'],
      image: '/image/projects/shubh-kadam-2-entrance.jpg',
      image_alt: 'Developer entrance rendering of Shubh Kadam 2.0 in Ramnagar',
      image_note: 'Developer artist impression',
      image_source: 'https://globalbirthdevelopers.com/images/shubh-kadam-2/shubh-kadam-main-entrance.jpg',
      source_url: 'https://globalbirthdevelopers.com/shubh-kadam-2.html',
      source_label: 'Shubh Kadam 2.0 developer project page',
      search_aliases: ['Shubhkadam 2.0 Subhkadam 2.0 Shubhkdam 2.0 Shubh Kadam 2'],
      detail_note: 'Images show the proposed development. Request the current approved plans, completion status, registration details and availability.'
    }
  ];

  projects.forEach(project => {
    project.region = project.region || 'delhi-ncr';
    project.cover_image = project.featured_image = project.image;
    project.images = [{ image_path: project.image, alt_text: project.image_alt }];
  });

  const normalize = value => String(value || '').trim().toLowerCase().replace(/gurugram/g, 'gurgaon');

  function select(filters = {}) {
    const region = filters.region || 'delhi-ncr';
    const location = normalize(filters.location);
    const words = normalize(filters.q).split(/\s+/).filter(Boolean);
    return projects.filter(project => {
      if (project.region !== region) return false;
      const place = normalize(`${project.locality} ${project.city}`);
      if (location && !['delhi ncr', 'delhi-ncr', 'uttarakhand'].includes(location) &&
          !normalize(project.city).startsWith(location) && !normalize(project.locality).includes(location)) return false;
      const searchable = normalize(`${project.name} ${place} ${project.developer} ${project.configuration} ${project.description} ${(project.search_aliases || []).join(' ')}`);
      if (!words.every(word => searchable.includes(word))) return false;
      if (filters.type && ![project.property_type, ...(project.property_types || [])].some(type => normalize(type) === normalize(filters.type))) return false;
      const bhk = filters.bhk || filters.configuration;
      if (bhk && !project.bhk_options.some(option => normalize(option) === normalize(bhk).replace(/\+$/, ''))) return false;
      // No published price means a project cannot truthfully match a price band.
      if (filters.budget || filters.min_price || filters.max_price) return false;
      if (filters.area && (!project.area_max || project.area_max < Number(filters.area))) return false;
      if (filters.furnishing && normalize(filters.furnishing) !== normalize(project.furnishing)) return false;
      if (filters.status && filters.status !== project.project_status) return false;
      return true;
    });
  }

  window.LandlineProjects = Object.assign(window.LandlineProjects || {}, {
    projects,
    select,
    find: slug => projects.find(project => project.slug === slug)
  });
})();
