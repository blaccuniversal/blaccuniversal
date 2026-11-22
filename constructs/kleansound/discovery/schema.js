/* KLS discovery questionnaire: content only. No company facts are assumed; everything is a question. */
window.KLS_FORM = (function () {
  var YNP = ['Yes', 'No', 'Planning to'];
  function has(id, v) { return function (a) { var x = a[id]; return Array.isArray(x) ? x.indexOf(v) >= 0 : x === v; }; }
  function anyOf(id, vs) { return function (a) { var x = a[id]; if (!x) return false; if (!Array.isArray(x)) x = [x]; return x.some(function (y) { return vs.indexOf(y) >= 0; }); }; }
  function gridIs(id, row, vs) { return function (a) { var g = a[id]; return !!(g && g[row] && vs.indexOf(g[row].v) >= 0); }; }

  var S = [];

  S.push({ id: 'about', title: 'About you', time: '1 min', intro: 'Tell us who is completing this form so we know who to contact if we need to clarify anything.', qs: [
    { id: 'r_name', t: 'Your full name', k: 'text', req: 1 },
    { id: 'r_role', t: 'Your role in the company', k: 'text', req: 1 },
    { id: 'r_email', t: 'Your email address', k: 'email', req: 1 },
    { id: 'r_phone', t: 'Your phone number', k: 'tel', req: 1, help: 'Include the country code, for example +234.' }
  ]});

  S.push({ id: 's1', title: 'Company information', time: '8 min', intro: 'The basics of the business, its story and what it stands for.', qs: [
    { id: 'official', t: 'Official registered business name', k: 'text', req: 1 },
    { id: 'trading', t: 'Trading name, if different', k: 'text' },
    { id: 'brand_use', t: 'How should the brand be written on the website?', k: 'radio', opts: ['KLS', 'KleanSound', 'KLS by KleanSound', 'Another way'], help: 'Choose the exact form you want customers to see.' },
    { id: 'brand_other', t: 'Please write it exactly as you want it', k: 'text', if: has('brand_use', 'Another way') },
    { id: 'year', t: 'Year established', k: 'number', req: 1, ph: 'e.g. 2015' },
    { id: 'founder', t: 'Founder or founders (full names)', k: 'text', req: 1 },
    { id: 'founder_bg', t: 'Founder background', k: 'long', help: 'Training, experience and what led to starting the company.' },
    { id: 'history', t: 'Company history', k: 'long', help: 'The story from the beginning to today, in your own words.' },
    { id: 'inspiration', t: 'What inspired the business?', k: 'long' },
    { id: 'kls_meaning', t: 'What does KLS stand for?', k: 'text' },
    { id: 'ks_meaning', t: 'What does the name KleanSound mean, and why was it chosen?', k: 'long' },
    { id: 'mission', t: 'Mission', k: 'long', help: 'What the company sets out to do, every day.' },
    { id: 'vision', t: 'Vision', k: 'long', help: 'Where the company wants to be in the future.' },
    { id: 'values', t: 'Core values', k: 'long', help: 'List three to six, with a line on what each means in practice.' },
    { id: 'milestones', t: 'Company milestones', k: 'long', help: 'Key dates and achievements, for example first product, first major project, new premises. Only include what you can confirm.' },
    { id: 'loc_types', t: 'What do you currently operate?', k: 'check', opts: ['Head office', 'Workshop', 'Factory', 'Showroom', 'Retail shop', 'Warehouse', 'Other'] },
    { id: 'loc_addr', t: 'Address and purpose of each location', k: 'long', help: 'One per line: address, then what happens there.', if: function (a) { return (a.loc_types || []).length > 0; } },
    { id: 'cac', t: 'Is the business registered with the Corporate Affairs Commission (CAC)?', k: 'radio', opts: ['Yes', 'No', 'Registration in progress'] },
    { id: 'cac_type', t: 'Type of registration', k: 'select', opts: ['Business name', 'Private limited company', 'Public limited company', 'Incorporated trustees', 'Other'], if: has('cac', 'Yes') },
    { id: 'cac_no', t: 'Registration number (RC or BN)', k: 'text', if: has('cac', 'Yes') },
    { id: 'cac_show', t: 'Should the registration number appear on the website?', k: 'radio', opts: ['Yes', 'No'], if: has('cac', 'Yes') }
  ]});

  S.push({ id: 's2', title: 'Operations and manufacturing', time: '8 min', intro: 'How the products are made, so the website describes it accurately.', qs: [
    { id: 'biz_model', t: 'Which of these describe the business?', k: 'check', req: 1, opts: ['We design and manufacture our own products', 'We assemble products from imported components', 'We distribute products made by other companies', 'We design here and have products made elsewhere', 'Other'], help: 'Select all that apply.' },
    { id: 'biz_other', t: 'Please explain', k: 'long', if: has('biz_model', 'Other') },
    { id: 'prod_place', t: 'Where does production or assembly take place?', k: 'long', help: 'Town, address if you wish to share it, and the size or type of the space.', if: anyOf('biz_model', ['We design and manufacture our own products', 'We assemble products from imported components', 'We design here and have products made elsewhere']) },
    { id: 'processes', t: 'Which of these processes happen in your own facility?', k: 'check', opts: ['Cabinet building and woodwork', 'Metal fabrication', 'Speaker driver assembly', 'Crossover and electronics assembly', 'Amplifier assembly', 'Painting or coating', 'Grille fitting', 'Testing', 'Packaging', 'Other'], if: anyOf('biz_model', ['We design and manufacture our own products', 'We assemble products from imported components']) },
    { id: 'equipment', t: 'What equipment and tools are used in production?', k: 'long', if: anyOf('biz_model', ['We design and manufacture our own products', 'We assemble products from imported components']) },
    { id: 'origin', t: 'Which parts are made locally and which are imported?', k: 'long', help: 'Be as specific as you can. We will only publish what you approve.', if: anyOf('biz_model', ['We design and manufacture our own products', 'We assemble products from imported components']) },
    { id: 'third_brands', t: 'Which third-party brands do you distribute?', k: 'long', if: has('biz_model', 'We distribute products made by other companies') },
    { id: 'qc', t: 'What quality control measures are used?', k: 'check', opts: ['Every unit is tested before sale', 'Samples from each batch are tested', 'Measurements are taken with test equipment', 'Burn-in or endurance testing', 'Visual and finish inspection', 'No formal process yet', 'Other'] },
    { id: 'qc_detail', t: 'Describe how quality control works', k: 'long' },
    { id: 'custom', t: 'Do you build custom speakers or systems on request?', k: 'radio', req: 1, opts: ['Yes', 'No', 'Sometimes'] },
    { id: 'custom_detail', t: 'What kinds of custom work do you do, and how long does it usually take?', k: 'long', if: anyOf('custom', ['Yes', 'Sometimes']) },
    { id: 'prod_diff', t: 'What makes your production process different from others?', k: 'long' },
    { id: 'capacity', t: 'Approximate production capacity (optional)', k: 'text', help: 'For example units per month. Share only if you are comfortable publishing or discussing it.' }
  ]});

  S.push({ id: 's3', title: 'Products and catalogue', time: '15+ min', intro: 'The most important section. Complete one product card for each product. Leave a field blank if you do not know, rather than estimating. Every specification will be checked with you before publishing.', qs: [
    { id: 'have_cat', t: 'Do you have an existing catalogue, brochure or technical specification sheet?', k: 'radio', req: 1, opts: ['Yes, I can provide it', 'Some products only', 'No'], help: 'If yes, you can send it instead of typing every detail below.' },
    { id: 'cat_link', t: 'Link to the catalogue or spec sheets', k: 'url', help: 'A Google Drive, Dropbox or WeTransfer link. Make sure the link is set so anyone with it can view.', if: anyOf('have_cat', ['Yes, I can provide it', 'Some products only']) },
    { id: 'cat_note', t: 'Anything we should know about that document?', k: 'long', if: anyOf('have_cat', ['Yes, I can provide it', 'Some products only']), help: 'For example which products it covers and whether the specs are current.' },
    { id: 'product_list', k: 'products' }
  ]});

  S.push({ id: 's4', title: 'Services', time: '5 min', intro: 'For each service, tell us whether you offer it. We will not list any service you do not confirm.', qs: [
    { id: 'services', k: 'grid', req: 1, rows: ['Sound system installation', 'Audio consultation', 'Church audio solutions', 'Studio audio solutions', 'Event sound systems', 'Equipment maintenance', 'Repairs', 'Equipment rentals', 'Custom audio solutions', 'Other professional audio services'], cols: YNP, note: 'If yes, add a short note: what is included, or how it is priced.' },
    { id: 'svc_focus', t: 'Which services matter most to the business?', k: 'long', help: 'The ones you want customers to know about first.' }
  ]});

  S.push({ id: 's5', title: 'Target audience and markets', time: '6 min', intro: 'Who the customers are and why they choose you.', qs: [
    { id: 'customers', t: 'Who are your primary customers?', k: 'check', req: 1, opts: ['Individuals and musicians', 'Churches and places of worship', 'Event planners and organisers', 'DJs', 'Clubs, bars and lounges', 'Hotels and venues', 'Schools and universities', 'Recording and media studios', 'Companies', 'Government and public bodies', 'Dealers and resellers', 'Rental companies', 'Other'] },
    { id: 'industries', t: 'Which industries do you serve?', k: 'check', opts: ['Religious', 'Entertainment', 'Hospitality', 'Education', 'Corporate', 'Government', 'Media and broadcast', 'Retail', 'Sports and recreation', 'Other'] },
    { id: 'sells_to', t: 'Do you sell to', k: 'check', opts: ['Individuals', 'Businesses', 'Institutions'] },
    { id: 'problems', t: 'What customer problems do your products and services solve?', k: 'long' },
    { id: 'markets', t: 'Which areas do you serve?', k: 'check', opts: ['Ibadan', 'Rest of Oyo State', 'South-West Nigeria', 'All of Nigeria', 'West Africa', 'Elsewhere in Africa', 'Outside Africa'] },
    { id: 'ideal', t: 'Describe your ideal customer', k: 'long' },
    { id: 'motive', t: 'What makes customers choose KLS?', k: 'check', opts: ['Sound quality', 'Price', 'Durability', 'Local support and repairs', 'Warranty', 'Availability', 'Customisation', 'Trust in the brand', 'Recommendations', 'Other'] },
    { id: 'motive_words', t: 'In your own words, why do customers choose you?', k: 'long' }
  ]});

  S.push({ id: 's6', title: 'Competitors and positioning', time: '7 min', intro: 'How the brand compares and how you want to be seen.', qs: [
    { id: 'comp_local', t: 'Who are your main local competitors?', k: 'long' },
    { id: 'comp_intl', t: 'Which international brands do you compete with?', k: 'long' },
    { id: 'diff', t: 'What differentiates KLS from them?', k: 'long', req: 1 },
    { id: 'sell_pts', t: 'What are your strongest selling points?', k: 'long', help: 'Three to five. Say only what you can prove.' },
    { id: 'proof', t: 'Can you back these points with evidence such as test results, customer references or awards?', k: 'radio', opts: ['Yes, for all', 'For some', 'Not yet'] },
    { id: 'objections', t: 'What objections do customers raise before buying?', k: 'long' },
    { id: 'misc', t: 'What misconceptions exist about locally made audio equipment?', k: 'long' },
    { id: 'perception', t: 'How should customers describe the brand?', k: 'check', opts: ['Professional', 'Affordable', 'Premium', 'Durable', 'Innovative', 'Proudly Nigerian', 'Reliable', 'Modern', 'Other'] },
    { id: 'perception_words', t: 'In your own words, how do you want customers to see the brand?', k: 'long' }
  ]});

  S.push({ id: 's7', title: 'Sales and distribution', time: '7 min', intro: 'How customers buy and receive products today.', qs: [
    { id: 'buy_how', t: 'How do customers buy from you?', k: 'check', req: 1, opts: ['In person at our location', 'By phone call', 'By WhatsApp', 'Through Instagram or other social media', 'Through dealers', 'Through our website', 'Other'] },
    { id: 'direct', t: 'Do you sell directly to customers?', k: 'radio', opts: ['Yes', 'No'] },
    { id: 'dealers', t: 'Do you have dealers or distributors?', k: 'radio', opts: ['Yes', 'No', 'Planning to'] },
    { id: 'dealer_where', t: 'Where are they, and can they be listed on the website?', k: 'long', if: anyOf('dealers', ['Yes']) },
    { id: 'dealer_recruit', t: 'Do you want the website to attract new dealers?', k: 'radio', opts: ['Yes', 'No', 'Not sure'], if: anyOf('dealers', ['Yes', 'Planning to']) },
    { id: 'wholesale', t: 'Do you offer wholesale pricing?', k: 'radio', opts: ['Yes', 'No'] },
    { id: 'wholesale_min', t: 'Is there a minimum order?', k: 'text', if: has('wholesale', 'Yes') },
    { id: 'deliver_out', t: 'Do you deliver outside Ibadan?', k: 'radio', opts: ['Yes', 'No'] },
    { id: 'deliver_nat', t: 'Do you deliver nationwide?', k: 'radio', opts: ['Yes', 'No', 'Some states only'], if: has('deliver_out', 'Yes') },
    { id: 'deliver_how', t: 'How is delivery handled, and how are delivery charges worked out?', k: 'long', if: has('deliver_out', 'Yes') },
    { id: 'custom_orders', t: 'Do you accept custom orders?', k: 'radio', opts: ['Yes', 'No'] },
    { id: 'pay', t: 'Which payment methods do you accept?', k: 'check', opts: ['Bank transfer', 'Cash', 'POS', 'Online card payment', 'Instalments or part payment', 'Cheque', 'Other'] },
    { id: 'quotes', t: 'Do you issue quotations?', k: 'radio', opts: ['Yes', 'No'] },
    { id: 'invoices', t: 'Do you issue invoices and receipts?', k: 'radio', opts: ['Yes', 'No'] },
    { id: 'sales_proc', t: 'Do you have a formal sales process?', k: 'radio', opts: ['Yes', 'No', 'Partly'] },
    { id: 'sales_steps', t: 'Describe the steps from first enquiry to delivery', k: 'long', if: anyOf('sales_proc', ['Yes', 'Partly']) }
  ]});

  S.push({ id: 's8', title: 'Customer support and after-sales', time: '6 min', intro: 'What customers can expect after they buy. This becomes the support information on the website.', qs: [
    { id: 'warranty_pol', t: 'Warranty policy', k: 'long', help: 'How long it lasts, what it covers and what it does not. Product-level warranty periods go on each product card.' },
    { id: 'repair', t: 'Do you repair KLS products?', k: 'radio', opts: ['Yes', 'No'] },
    { id: 'repair_detail', t: 'How do repairs work? Include typical turnaround.', k: 'long', if: has('repair', 'Yes') },
    { id: 'maint', t: 'Do you offer maintenance or servicing of products?', k: 'radio', opts: ['Yes', 'No'] },
    { id: 'tech', t: 'Do you provide technical support?', k: 'radio', opts: ['Yes', 'No'] },
    { id: 'tech_detail', t: 'What does technical support cover, and what are the hours?', k: 'long', if: has('tech', 'Yes') },
    { id: 'install_incl', t: 'Is installation included, optional or not offered with a purchase?', k: 'radio', opts: ['Included', 'Optional, extra cost', 'Not offered'] },
    { id: 'complaints', t: 'How are complaints handled, and how quickly do you respond?', k: 'long' },
    { id: 'returns', t: 'Return and replacement policy', k: 'long' },
    { id: 'channels', t: 'Which support channels do you offer?', k: 'check', opts: ['Phone', 'WhatsApp', 'Email', 'Instagram or other social media', 'Visit the workshop or showroom', 'Other'] },
    { id: 'hours', t: 'Support hours', k: 'text', help: 'For example Monday to Saturday, 9am to 5pm.' }
  ]});

  S.push({ id: 's9', title: 'Brand identity and visual assets', time: '8 min', intro: 'We cannot accept file uploads on this page. For every item you can provide, upload the files to a shared folder (Google Drive, Dropbox or WeTransfer) and paste one link below. Only share material you own or have permission to use.', qs: [
    { id: 'assets', k: 'grid', rows: ['Logo files (vector or high-resolution)', 'Brand guidelines', 'Product photographs', 'Factory photographs', 'Workshop photographs', 'Team photographs', 'Installation photographs', 'Promotional videos', 'Product demonstration videos', 'Other brochures and marketing materials', 'Existing marketing materials (flyers, posters, adverts)'], cols: ['I will provide', 'Not available', 'Not sure'], note: 'If you will provide it, add where it is.' },
    { id: 'asset_link', t: 'Link to your shared folder', k: 'url', help: 'Check the link opens for anyone who has it.' },
    { id: 'colours', t: 'Brand colours', k: 'text', help: 'Colour codes if you have them, otherwise describe the colours or write “not defined”.' },
    { id: 'fonts', t: 'Brand fonts', k: 'text', help: 'Names of the typefaces, or “not defined”.' },
    { id: 'asset_rights', t: 'Do you hold the rights to the images and videos you will share?', k: 'radio', opts: ['Yes, all of them', 'Some, I will say which', 'Not sure'] },
    { id: 'asset_rights_note', t: 'Which ones are not yours, and who owns them?', k: 'long', if: anyOf('asset_rights', ['Some, I will say which', 'Not sure']) }
  ]});

  S.push({ id: 's10', title: 'Website objectives and features', time: '8 min', intro: 'What the website should do for the business. Mark each feature as essential now, a later improvement, or not needed.', qs: [
    { id: 'objectives', t: 'What should the website achieve?', k: 'check', req: 1, opts: ['Build trust in the brand', 'Show the full range of products', 'Bring in quote requests', 'Sell products online', 'Recruit dealers and distributors', 'Provide support and downloads', 'Win installation and rental projects', 'Other'] },
    { id: 'top_obj', t: 'If it could only do one thing, what should it be?', k: 'text', req: 1 },
    { id: 'actions', t: 'What do you want visitors to do?', k: 'check', opts: ['Request a quote', 'Message on WhatsApp', 'Call', 'Buy online', 'Visit the showroom', 'Become a dealer', 'Download a catalogue or spec sheet', 'Book a consultation', 'Other'] },
    { id: 'features', k: 'grid', req: 1, rows: ['Product catalogue', 'Online shopping', 'Product filtering and search', 'Product comparison', 'Quote request forms', 'WhatsApp integration', 'Contact forms', 'Dealer registration', 'Distributor enquiries', 'Customer accounts', 'Blog or news section', 'Project portfolio', 'Frequently asked questions', 'Technical support portal', 'Website administration panel'], cols: ['Essential', 'Later', 'Not needed'], note: 'Essential means the website is not ready without it. Later means a future improvement.', noNote: 1 },
    { id: 'shop_pay', t: 'Online shopping: which payment and delivery arrangements should it support?', k: 'long', if: gridIs('features', 'Online shopping', ['Essential', 'Later']) },
    { id: 'wa_no', t: 'WhatsApp: which number should enquiries go to?', k: 'tel', if: gridIs('features', 'WhatsApp integration', ['Essential', 'Later']) },
    { id: 'dealer_info', t: 'Dealer registration: what information should dealers provide, and who reviews applications?', k: 'long', if: gridIs('features', 'Dealer registration', ['Essential', 'Later']) },
    { id: 'blog_who', t: 'Blog or news: who will write and how often?', k: 'text', if: gridIs('features', 'Blog or news section', ['Essential', 'Later']) },
    { id: 'admin_who', t: 'Who will update the website after launch?', k: 'radio', opts: ['Someone on our team', 'We want a team to do it for us', 'A mix of both', 'Not sure'] },
    { id: 'admin_skill', t: 'How comfortable is your team with editing a website?', k: 'radio', opts: ['Not at all', 'Basic', 'Comfortable'], if: anyOf('admin_who', ['Someone on our team', 'A mix of both']) },
    { id: 'admin_extra', t: 'Anything else the website should do?', k: 'long' }
  ]});

  S.push({ id: 's11', title: 'Website content and communication', time: '8 min', intro: 'How the brand should sound, and any material we can use.', qs: [
    { id: 'tone', t: 'Preferred brand tone', k: 'check', opts: ['Professional', 'Friendly', 'Bold', 'Technical', 'Premium', 'Down to earth', 'Inspiring', 'Other'] },
    { id: 'style', t: 'Preferred writing style', k: 'radio', opts: ['Short and simple', 'Detailed and technical', 'A mix of both'] },
    { id: 'messages', t: 'Key messages you want visitors to remember', k: 'long' },
    { id: 'slogan', t: 'Existing slogans or taglines', k: 'text' },
    { id: 'cta', t: 'Preferred calls to action', k: 'check', opts: ['Get a quote', 'Call us', 'WhatsApp us', 'Visit our showroom', 'Become a dealer', 'Shop now', 'Book a demo', 'Other'] },
    { id: 'avoid', t: 'Words, claims or topics to avoid', k: 'long' },
    { id: 'copy', t: 'Do you have existing website or marketing copy we may reuse?', k: 'radio', opts: ['Yes', 'No'] },
    { id: 'copy_link', t: 'Link to the copy', k: 'url', if: has('copy', 'Yes') },
    { id: 'testi', t: 'Customer testimonials', k: 'radio', opts: ['I have some', 'I can collect some', 'None yet'] },
    { id: 'testi_link', t: 'Link, or paste them here with the customer name and permission to publish', k: 'long', if: has('testi', 'I have some') },
    { id: 'cases', t: 'Case studies or completed projects', k: 'radio', opts: ['I have some', 'I can prepare some', 'None yet'] },
    { id: 'cases_link', t: 'Link, or describe them here', k: 'long', if: has('cases', 'I have some') },
    { id: 'certs', t: 'Certifications, standards compliance and awards', k: 'long', help: 'List only those you can prove. Do not include anything you are not sure of.' },
    { id: 'certs_link', t: 'Link to proof (certificate scans or photos)', k: 'url', if: function (a) { return !!(a.certs || '').trim(); } }
  ]});

  S.push({ id: 's12', title: 'Digital presence', time: '3 min', intro: 'Paste links or handles for what exists. Leave blank if it does not.', qs: [
    { id: 'ig', t: 'Instagram', k: 'text' }, { id: 'fb', t: 'Facebook', k: 'text' }, { id: 'tt', t: 'TikTok', k: 'text' }, { id: 'yt', t: 'YouTube', k: 'text' }, { id: 'li', t: 'LinkedIn', k: 'text' },
    { id: 'wab', t: 'WhatsApp Business number or link', k: 'text' },
    { id: 'site', t: 'Existing website', k: 'text' },
    { id: 'gbp', t: 'Google Business Profile link', k: 'text' },
    { id: 'other_social', t: 'Any other platform', k: 'text' }
  ]});

  S.push({ id: 's13', title: 'Project logistics', time: '4 min', intro: 'How we will work together. Please do not write any passwords here.', qs: [
    { id: 'decider', t: 'Primary decision-maker (name and role)', k: 'text', req: 1 },
    { id: 'pcontact', t: 'Project contact person (name, phone and email)', k: 'text', req: 1 },
    { id: 'comm', t: 'Preferred way to communicate', k: 'check', opts: ['WhatsApp', 'Phone call', 'Email', 'Video call', 'In person'] },
    { id: 'comm_times', t: 'Best days and times to reach you', k: 'text' },
    { id: 'launch', t: 'Expected launch date', k: 'date' },
    { id: 'launch_flex', t: 'Is that date firm?', k: 'radio', opts: ['Firm deadline', 'Flexible', 'No date yet'] },
    { id: 'approval', t: 'How will content and designs be approved, and by whom? How long does approval usually take?', k: 'long' },
    { id: 'maintain', t: 'What do you expect after launch?', k: 'radio', opts: ['We will manage it ourselves', 'Ongoing support from the web team', 'Occasional updates when needed', 'Not sure'] },
    { id: 'domain', t: 'Do you own a domain name?', k: 'radio', opts: ['Yes', 'No', 'Not sure'] },
    { id: 'domain_name', t: 'What is it, and where was it registered?', k: 'text', if: has('domain', 'Yes') },
    { id: 'hosting', t: 'Do you have website hosting?', k: 'radio', opts: ['Yes', 'No', 'Not sure'] },
    { id: 'hosting_name', t: 'Which provider?', k: 'text', if: has('hosting', 'Yes') },
    { id: 'more', t: 'Any additional requirements or concerns?', k: 'long' }
  ]});

  var PRODUCT = [
    { id: 'name', t: 'Product name', k: 'text', req: 1 },
    { id: 'model', t: 'Model number', k: 'text' },
    { id: 'cat', t: 'Product category', k: 'select', opts: ['Full-range speaker', 'Subwoofer', 'Line array element', 'Monitor or wedge', 'Portable PA system', 'Powered (active) speaker', 'Amplifier', 'Mixer or processor', 'Accessory', 'Other'] },
    { id: 'desc', t: 'Product description', k: 'long', help: 'Two to four sentences in plain English.' },
    { id: 'apps', t: 'Intended applications', k: 'check', opts: ['Worship', 'Live bands', 'DJs and clubs', 'Events and weddings', 'Studios', 'Schools', 'Corporate', 'Outdoor', 'Home', 'Other'] },
    { id: 'features', t: 'Key features', k: 'long', help: 'One per line.' },
    { id: 'type', t: 'Is it passive or powered?', k: 'radio', opts: ['Passive (needs an amplifier)', 'Powered (built-in amplifier)', 'Both versions'] },
    { id: 'power', t: 'Power output', k: 'text', help: 'State the figure and how it is measured, for example RMS, programme or peak.' },
    { id: 'freq', t: 'Frequency response', k: 'text', help: 'Include the tolerance, for example 50 Hz to 20 kHz (±3 dB).' },
    { id: 'imp', t: 'Impedance', k: 'text' },
    { id: 'sens', t: 'Sensitivity', k: 'text', help: 'In dB at 1 W / 1 m, if tested.' },
    { id: 'drivers', t: 'Driver configuration', k: 'text', help: 'Number, size and type of each driver, for example 1 × 15 inch woofer.' },
    { id: 'dims', t: 'Dimensions', k: 'text', help: 'Height × width × depth, and the unit.' },
    { id: 'weight', t: 'Weight', k: 'text' },
    { id: 'colours', t: 'Available colours and variations', k: 'text' },
    { id: 'connect', t: 'Connectivity options', k: 'check', opts: ['XLR', 'Jack (6.3 mm)', 'Speakon', 'RCA', 'Bluetooth', 'USB', 'Other'] },
    { id: 'access', t: 'Accessories', k: 'text', help: 'What is supplied, and what can be bought separately.' },
    { id: 'warranty', t: 'Warranty period', k: 'text' },
    { id: 'price', t: 'Price in naira', k: 'text', help: 'Say whether it includes VAT.' },
    { id: 'price_show', t: 'How should the price be shown on the website?', k: 'radio', opts: ['Show the price', 'Show “from” price', 'Request a quote'] },
    { id: 'avail', t: 'Availability', k: 'radio', opts: ['In stock', 'Made to order', 'Limited stock', 'Coming soon', 'Discontinued'] },
    { id: 'media', t: 'Link to photos and videos of this product', k: 'url', help: 'Or write “in shared folder” if you will include them in your main folder.' },
    { id: 'notes', t: 'Anything else about this product', k: 'long' }
  ];

  var CHECKLIST = [
    ['Company', ['Registration documents, if you want any shown on the site', 'Short company profile or any existing “about us” text', 'Founder photograph and biography']],
    ['Brand', ['Logo files in high resolution or vector format', 'Brand guidelines, if they exist', 'Brand colour codes and font names']],
    ['Products', ['Catalogue, brochures or technical specification sheets', 'Current price list', 'Warranty and returns documents', 'Photographs of every product from several angles', 'Product videos or demonstrations']],
    ['Operations', ['Photographs of the factory or workshop', 'Photographs of the team at work', 'Photographs and notes from installations and projects']],
    ['Content', ['Customer testimonials with permission to publish', 'Case studies or project summaries', 'Proof of any certifications or awards you want to mention', 'Any existing website or marketing text']],
    ['Accounts and access', ['Social media links and Google Business Profile link', 'Domain registrar and hosting provider names (share logins only through a secure channel, never in this form)', 'WhatsApp Business number for the website']]
  ];
  return { sections: S, product: PRODUCT, checklist: CHECKLIST };
})();
