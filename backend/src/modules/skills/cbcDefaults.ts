/**
 * Ready-made skill frameworks a school can load with one click instead of typing every
 * subject's fields of study from scratch (Exams → Skill-Based Reports → Skills setup →
 * "Load CBC defaults").
 *
 * The field-of-study names here are KICD's own CBC STRANDS (the top-level organisation of
 * every Learning Area's curriculum design — e.g. Mathematics' five strands are Numbers,
 * Algebra, Geometry, Measurements, and Data Handling & Probability; Integrated Science's
 * are Scientific Investigation, Mixtures-Elements-Compounds, Living Things and Their
 * Environment, and Force and Energy; Social Studies' include Natural & Built Environment
 * and Political Development & Governance), confirmed against KICD's published Grade 4-9
 * curriculum designs (kicd.ac.ke). The skills listed under each strand are NOT KICD's own
 * sub-strand wording verbatim — they are practical, observable "can do" statements a
 * teacher can rate a learner against (what a skill-based report needs), written to match
 * that strand's actual scope. A school should still edit/add to these to match their own
 * scheme of work and grade band — this is a starting point, not a replacement for the
 * official curriculum design.
 */
export interface CbcDefaultArea { subject: string; area: string; scale: string; skills: string[] }

export const CBC_DEFAULT_SKILLS: CbcDefaultArea[] = [
    // ── English ──────────────────────────────────────────────────────────────
    { subject: 'English', area: 'Listening and Speaking', scale: 'cbc', skills: [
        'Listens attentively and responds appropriately to spoken instructions',
        'Expresses ideas clearly and confidently in conversation',
        'Uses correct pronunciation, stress and intonation',
        'Participates in discussions, giving reasons for opinions',
    ] },
    { subject: 'English', area: 'Reading', scale: 'cbc', skills: [
        'Reads a grade-appropriate text fluently and with correct expression',
        'Identifies the main idea and supporting details in a text',
        'Uses context clues to work out the meaning of new words',
        'Answers comprehension questions on a passage read',
    ] },
    { subject: 'English', area: 'Grammar', scale: 'cbc', skills: [
        'Uses correct sentence structure and punctuation',
        'Applies tenses, parts of speech and subject-verb agreement correctly',
        'Builds and expands vocabulary appropriate to the grade',
    ] },
    { subject: 'English', area: 'Writing', scale: 'cbc', skills: [
        'Writes a well-organised paragraph/composition with a clear beginning, middle and end',
        'Writes legibly, spelling grade-level words correctly',
        'Writes for different purposes (narrative, descriptive, letter, report)',
    ] },

    // ── Kiswahili ────────────────────────────────────────────────────────────
    { subject: 'Kiswahili', area: 'Kusikiliza na Kuzungumza', scale: 'cbc', skills: [
        'Husikiliza kwa makini na kujibu maswali kwa usahihi',
        'Hutumia lugha ifaayo katika mazungumzo',
        'Hushiriki kwa ujasiri katika mijadala',
    ] },
    { subject: 'Kiswahili', area: 'Kusoma', scale: 'cbc', skills: [
        'Husoma kifungu kwa ufasaha na matamshi mwafaka',
        'Hubainisha wazo kuu na vijambo muhimu katika kifungu',
        'Hujibu maswali ya ufahamu kwa usahihi',
    ] },
    { subject: 'Kiswahili', area: 'Sarufi na Matumizi ya Lugha', scale: 'cbc', skills: [
        'Hutumia sarufi (ngeli, nyakati, viambishi) kwa usahihi',
        'Huunda sentensi sahihi na zenye mshikamano',
    ] },
    { subject: 'Kiswahili', area: 'Kuandika', scale: 'cbc', skills: [
        'Huandika insha fupi yenye mpangilio mzuri',
        'Huandika kwa mwandiko bora na tahajia sahihi',
    ] },

    // ── Mathematics ──────────────────────────────────────────────────────────
    { subject: 'Mathematics', area: 'Numbers', scale: 'cbc', skills: [
        'Reads, writes and compares whole numbers using place value',
        'Performs the four basic operations correctly',
        'Works with fractions, decimals and percentages',
        'Identifies factors, multiples, squares and square roots',
    ] },
    { subject: 'Mathematics', area: 'Algebra', scale: 'cbc', skills: [
        'Forms and simplifies algebraic expressions',
        'Solves linear equations and inequalities',
    ] },
    { subject: 'Mathematics', area: 'Geometry', scale: 'cbc', skills: [
        'Identifies and classifies 2-D and 3-D shapes by their properties',
        'Measures and constructs angles accurately',
    ] },
    { subject: 'Mathematics', area: 'Measurements', scale: 'cbc', skills: [
        'Measures length, mass, capacity and time using correct units',
        'Calculates area, perimeter and volume of common shapes',
        'Solves money/commercial arithmetic problems',
    ] },
    { subject: 'Mathematics', area: 'Data Handling and Probability', scale: 'cbc', skills: [
        'Collects, organises and represents data in tables, charts and graphs',
        'Interprets data to draw simple conclusions',
    ] },

    // ── Integrated Science ───────────────────────────────────────────────────
    { subject: 'Integrated Science', area: 'Scientific Investigation', scale: 'cbc', skills: [
        'Follows safety rules when carrying out a practical activity',
        'Makes accurate observations and records results',
        'Draws reasonable conclusions from an investigation',
    ] },
    { subject: 'Integrated Science', area: 'Mixtures, Elements and Compounds', scale: 'cbc', skills: [
        'Separates mixtures using an appropriate method',
        'Distinguishes between elements, compounds and mixtures',
        'Tests substances using simple acid/base indicators',
    ] },
    { subject: 'Integrated Science', area: 'Living Things and Their Environment', scale: 'cbc', skills: [
        'Classifies living things based on observable characteristics',
        'Explains the interdependence of living things in an ecosystem',
        'Describes how to care for and conserve the environment',
    ] },
    { subject: 'Integrated Science', area: 'Force and Energy', scale: 'cbc', skills: [
        'Explains everyday effects of force and simple machines',
        'Describes sources, transfer and conservation of energy',
        'Demonstrates safe use of electricity and magnetism',
    ] },

    // ── Health Education ─────────────────────────────────────────────────────
    { subject: 'Health Education', area: 'Personal and Environmental Health', scale: 'cbc', skills: [
        'Practises good personal hygiene habits',
        'Explains how to keep the environment clean and safe',
    ] },
    { subject: 'Health Education', area: 'Nutrition and Disease Prevention', scale: 'cbc', skills: [
        'Identifies food groups and explains a balanced diet',
        'Describes ways of preventing common communicable diseases',
    ] },

    // ── Social Studies ───────────────────────────────────────────────────────
    { subject: 'Social Studies', area: 'Citizenship and Social Relations', scale: 'cbc', skills: [
        'Explains the rights and responsibilities of a good citizen',
        'Demonstrates respect for diversity and other people\'s views',
    ] },
    { subject: 'Social Studies', area: 'Natural and Built Environment', scale: 'cbc', skills: [
        'Locates and describes key physical and human features on a map',
        'Explains how people use and conserve natural resources',
    ] },
    { subject: 'Social Studies', area: 'Economic Activities', scale: 'cbc', skills: [
        'Identifies economic activities in the local and wider community',
        'Explains how resources are used to meet human needs',
    ] },
    { subject: 'Social Studies', area: 'Political Development and Governance', scale: 'cbc', skills: [
        'Explains Kenya\'s system of government and the Constitution',
        'Describes how citizens participate in governance processes',
    ] },

    // ── Christian Religious Education ────────────────────────────────────────
    { subject: 'Christian Religious Education', area: 'The Bible', scale: 'cbc', skills: [
        'Locates books, chapters and verses in the Bible',
        'Narrates and explains the meaning of a given Bible story',
    ] },
    { subject: 'Christian Religious Education', area: 'Christian Living', scale: 'cbc', skills: [
        'Applies Christian values in everyday relationships and decisions',
        'Explains the importance of prayer and worship in Christian life',
    ] },
    { subject: 'Christian Religious Education', area: 'The Church', scale: 'cbc', skills: [
        'Explains the role of the Church in society',
        'Describes Christian rites of passage and their significance',
    ] },

    // ── Islamic Religious Education ──────────────────────────────────────────
    { subject: 'Islamic Religious Education', area: 'Qur\'an', scale: 'cbc', skills: [
        'Recites assigned Surahs correctly',
        'Explains the meaning and lesson of a given Qur\'anic verse',
    ] },
    { subject: 'Islamic Religious Education', area: 'Ibadah (Worship)', scale: 'cbc', skills: [
        'Demonstrates the correct performance of Salah',
        'Explains the significance of the Pillars of Islam',
    ] },
    { subject: 'Islamic Religious Education', area: 'Islamic Living', scale: 'cbc', skills: [
        'Applies Islamic values (akhlaq) in daily life',
    ] },

    // ── Agriculture ──────────────────────────────────────────────────────────
    { subject: 'Agriculture', area: 'Crop Production', scale: 'cbc', skills: [
        'Prepares land and establishes a crop correctly',
        'Carries out routine crop husbandry practices (weeding, watering, pest control)',
        'Harvests, handles and stores produce correctly',
    ] },
    { subject: 'Agriculture', area: 'Livestock Production', scale: 'cbc', skills: [
        'Describes housing, feeding and general care of farm animals',
        'Identifies signs of common animal diseases and basic control measures',
    ] },
    { subject: 'Agriculture', area: 'Farm Structures and Tools', scale: 'cbc', skills: [
        'Identifies and uses common farm tools and equipment safely',
        'Explains the use and maintenance of simple farm structures',
    ] },

    // ── Creative Arts (and Sports) ───────────────────────────────────────────
    { subject: 'Creative Arts', area: 'Visual Art', scale: 'cbc', skills: [
        'Creates an original artwork using an appropriate technique and medium',
        'Appreciates and describes artworks, including from the local culture',
    ] },
    { subject: 'Creative Arts', area: 'Performing Arts (Music and Drama)', scale: 'cbc', skills: [
        'Performs a song, dance or short drama piece confidently',
        'Shows creativity and teamwork in a group performance',
    ] },
    { subject: 'Creative Arts', area: 'Physical and Health Education', scale: 'cbc', skills: [
        'Demonstrates correct technique in a given game or athletic activity',
        'Shows sportsmanship, teamwork and fair play',
    ] },

    // ── Pre-Technical Studies ────────────────────────────────────────────────
    { subject: 'Pre-Technical Studies', area: 'Foundations of Technology', scale: 'cbc', skills: [
        'Identifies and safely uses basic hand tools',
        'Explains simple engineering/construction concepts and their uses',
    ] },
    { subject: 'Pre-Technical Studies', area: 'Home Science', scale: 'cbc', skills: [
        'Demonstrates basic food and nutrition practices',
        'Demonstrates basic clothing and textile skills',
    ] },
    { subject: 'Pre-Technical Studies', area: 'Business and Entrepreneurship', scale: 'cbc', skills: [
        'Explains basic business/entrepreneurship concepts',
        'Keeps simple records of a mock business activity',
    ] },

    // ── Life Skills Education ────────────────────────────────────────────────
    { subject: 'Life Skills Education', area: 'Self-Awareness and Self-Esteem', scale: 'cbc', skills: [
        'Identifies own strengths, weaknesses and interests',
        'Manages emotions appropriately in different situations',
    ] },
    { subject: 'Life Skills Education', area: 'Interpersonal Relationships', scale: 'cbc', skills: [
        'Communicates and cooperates well with peers and adults',
        'Resolves conflict peacefully and makes responsible decisions',
    ] },
];

/** Every subject with a default framework available (for the "Load defaults" picker). */
export const CBC_DEFAULT_SUBJECTS = Array.from(new Set(CBC_DEFAULT_SKILLS.map(a => a.subject)));
