document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') return;

    document.body.classList.add('home-premium');
    const footer = document.querySelector('footer');
    if (!footer) return;

    const image = {
        gurgaonApartment: 'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?auto=format&fit=crop&w=1200&q=85',
        noidaResidence: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=85',
        gurgaonVilla: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85',
        highRise: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85',
        greenProject: 'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1200&q=85',
        gatedCommunity: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=85',
        consultant: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1600&q=85',
        interior: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85',
        office: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=85',
        plot: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=85'
    };

    const project = (name, location, detail, price, img, badge) => `
        <article class="quote-project">
            <img loading="lazy" src="${img}" alt="${name} in ${location}">
            <div><span class="quote-kicker">${badge}</span><h3>${name}</h3><p>${location}</p><p>${detail}</p><p class="project-price">${price}</p><a class="btn btn-dark" href="property-details.html">View Property</a></div>
        </article>`;
    const type = (name, img) => `<a class="type-card" href="featured-properties.html" style="background-image:url('${img}')"><span>${name}</span></a>`;
    const location = (name, description, img, href) => `
        <a href="${href}" style="background-image:url('${img}')"><div><h3>${name}</h3><p>${description}</p><span class="btn location-link">Explore</span></div></a>`;

    footer.insertAdjacentHTML('beforebegin', `
        <section class="quote-section light" aria-labelledby="collection-title"><div class="container">
            <span class="quote-kicker">Premium property collection</span>
            <h2 class="quote-heading" id="collection-title">Homes selected for the way you want to live</h2>
            <p class="quote-intro">Explore luxury residences and investment-ready homes across Delhi NCR, with clear property details and local guidance.</p>
            <div class="quote-cards">
                ${project('The Golf Course Residence', 'Golf Course Road, Gurgaon', '3 BHK · 1,850 sq. ft.', 'Starting from ₹2.50 Cr', image.gurgaonApartment, 'Gurgaon residence')}
                ${project('Skyline Four', 'Sector 150, Noida', '4 BHK · 2,450 sq. ft.', 'Starting from ₹3.20 Cr', image.noidaResidence, 'Noida residence')}
                ${project('Aravalli Courtyard Villa', 'Sector 79, Gurgaon', '4 BHK · 3,200 sq. ft.', 'Price on request', image.gurgaonVilla, 'Gurgaon villa')}
            </div>
        </div></section>
        <section class="quote-section" aria-labelledby="types-title"><div class="container">
            <span class="quote-kicker">Property types</span><h2 class="quote-heading" id="types-title">Find the property that fits your plans</h2>
            <div class="type-grid">
                ${type('Apartments', image.noidaResidence)}${type('Plots', image.plot)}${type('Villas', image.gurgaonVilla)}${type('Commercial', image.office)}${type('Luxury Homes', image.interior)}${type('New Projects', image.highRise)}
            </div>
        </div></section>
        <section class="quote-section light" aria-labelledby="why-title"><div class="container why-split">
            <img loading="lazy" src="${image.interior}" alt="Refined contemporary interior in a premium Delhi NCR home">
            <div><span class="quote-kicker">Why Landline</span><h2 class="quote-heading" id="why-title">A smarter way to find property</h2><p class="quote-intro">Landline Properties helps you move from a broad search to a considered shortlist with local support at every stage.</p>
                <div class="quote-points"><div><strong>Curated Property Options</strong><br>Explore carefully selected residential, commercial and investment opportunities.</div><div><strong>Local Market Expertise</strong><br>Get guidance from professionals familiar with Gurgaon, Noida and Greater Noida.</div><div><strong>Personalized Assistance</strong><br>Shortlist properties by location, budget, configuration and requirements.</div><div><strong>Easy Property Visits</strong><br>Connect with the right representative and arrange visits with ease.</div></div>
            </div>
        </div></section>
        <section class="quote-section" aria-labelledby="locations-title"><div class="container">
            <span class="quote-kicker">Prime locations</span><h2 class="quote-heading" id="locations-title">Explore Delhi NCR, neighbourhood by neighbourhood</h2>
            <div class="location-premium">
                ${location('Gurgaon', 'Luxury residences, premium communities and high-value investment opportunities across established and emerging sectors.', image.highRise, 'gurgaon-properties.html')}
                ${location('Noida', 'Modern residential communities, excellent connectivity and a growing lifestyle and commercial ecosystem.', image.noidaResidence, 'noida-properties.html')}
                ${location('Greater Noida', 'Expanding infrastructure, spacious developments and promising opportunities for homebuyers and investors.', image.gatedCommunity, 'locations.html')}
                ${location('Delhi NCR', 'Established residential neighbourhoods, commercial destinations and strategically located properties.', image.office, 'locations.html')}
            </div>
        </div></section>
        <section class="quote-section dark" aria-labelledby="investment-title"><div class="container">
            <span class="quote-kicker">Investment opportunities</span><h2 class="quote-heading" id="investment-title">Build a considered property portfolio</h2><p class="quote-intro">Discover homes, plots and commercial opportunities in high-growth Delhi NCR locations. Discuss current availability and suitability with a local professional.</p><a class="btn btn-gold" href="contact.html">Explore Investments</a>
        </div></section>
        <section class="quote-section" aria-labelledby="expert-title"><div class="container"><div class="expert-banner" style="background-image:linear-gradient(90deg, rgba(13,18,24,.92), rgba(13,18,24,.32)),url('${image.consultant}')"><div><span class="quote-kicker">Property consultation</span><h2 class="quote-heading" id="expert-title">Tell us what you’re looking for</h2><p>Share your preferred location, property type, budget and requirements. Our team will help you discover suitable options and connect you with the right local professional.</p><a class="btn btn-gold" href="#contact">Get Expert Assistance</a></div></div></div></section>
        <section class="quote-section light" aria-labelledby="guides-title"><div class="container"><span class="quote-kicker">Real estate insights</span><h2 class="quote-heading" id="guides-title">Useful guides for your Delhi NCR property search</h2><div class="blog-grid">
            <article class="blog-card"><img loading="lazy" src="${image.gurgaonApartment}" alt="Luxury apartment exterior in Gurgaon"><div><small>Gurgaon · Guide</small><h3>How to compare luxury apartments in Gurgaon</h3><p>Focus your shortlist around micro-market, layout, commute and on-site experience.</p><a href="featured-properties.html">Explore Properties</a></div></article>
            <article class="blog-card"><img loading="lazy" src="${image.greenProject}" alt="Green residential community for Noida homebuyers"><div><small>Noida · Guide</small><h3>What to consider when buying in Noida</h3><p>Review connectivity, social infrastructure and the kind of community that suits you.</p><a href="noida-properties.html">Explore Noida</a></div></article>
            <article class="blog-card"><img loading="lazy" src="${image.gatedCommunity}" alt="Modern Greater Noida gated residential community"><div><small>Greater Noida · Guide</small><h3>Planning a property visit in Greater Noida</h3><p>Bring a clear brief so each visit answers the questions that matter to you.</p><a href="locations.html">Explore Locations</a></div></article>
        </div></div></section>
        <nav class="quote-mobile-actions" aria-label="Mobile quick actions"><a href="index.html">Home</a><a href="#properties">Search</a><a href="featured-properties.html">Properties</a><a href="#contact">Enquire</a></nav>`);
});
