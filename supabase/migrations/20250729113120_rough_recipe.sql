/*
  # Add Sample Teaching Techniques

  1. Sample Data
    - Add 5 realistic teaching techniques with proper Dutch content
    - Include associations with age groups, subjects, and materials
    - Add external links and video URLs for each technique

  2. Content
    - Coöperatief Leren (Collaborative Learning)
    - Flipped Classroom
    - Gamification in het Onderwijs
    - Mindfulness in de Klas
    - Gedifferentieerd Onderwijs
*/

-- Insert sample teaching techniques
INSERT INTO teaching_techniques (
  title,
  subtitle,
  description,
  student_video_url,
  teacher_video_url,
  external_links,
  created_by,
  is_active
) VALUES 
(
  'Coöperatief Leren',
  'Samen leren, samen groeien',
  'Coöperatief leren is een onderwijsmethode waarbij leerlingen in kleine groepen samenwerken om een gemeenschappelijk doel te bereiken. Deze methode bevordert niet alleen academische prestaties, maar ook sociale vaardigheden zoals communicatie, leiderschap en empathie.

Belangrijke elementen:
• Positieve wederzijdse afhankelijkheid
• Individuele verantwoordelijkheid
• Gelijke participatie
• Sociale vaardigheden
• Groepsreflectie

Deze techniek is bijzonder effectief voor het ontwikkelen van 21e-eeuwse vaardigheden en het creëren van een inclusieve leeromgeving.',
  'https://vimeo.com/123456789',
  'https://vimeo.com/987654321',
  '[
    {"title": "Coöperatief Leren Handleiding", "url": "https://www.onderwijskennis.nl/cooperatief-leren"},
    {"title": "Praktische Tips", "url": "https://www.leraar24.nl/cooperatief-leren-tips"}
  ]'::jsonb,
  (SELECT id FROM profiles LIMIT 1),
  true
),
(
  'Flipped Classroom',
  'Theorie thuis, praktijk in de klas',
  'De Flipped Classroom methode draait de traditionele lesmethode om. Leerlingen bestuderen nieuwe concepten thuis via video''s of online materialen, terwijl de kostbare lestijd wordt gebruikt voor actieve oefening, discussie en begeleiding.

Voordelen:
• Meer tijd voor individuele begeleiding
• Actievere betrokkenheid van leerlingen
• Flexibel leren in eigen tempo
• Dieper begrip door praktische toepassing
• Betere voorbereiding op examens

Deze methode werkt het beste wanneer leerlingen toegang hebben tot technologie en gemotiveerd zijn om zelfstandig te leren.',
  'https://vimeo.com/234567890',
  'https://vimeo.com/876543210',
  '[
    {"title": "Flipped Classroom Gids", "url": "https://www.edutopia.org/flipped-classroom"},
    {"title": "Video Maken Tips", "url": "https://www.kennisnet.nl/flipped-classroom"}
  ]'::jsonb,
  (SELECT id FROM profiles LIMIT 1),
  true
),
(
  'Gamification in het Onderwijs',
  'Leren door spelen',
  'Gamification gebruikt spelelementen in niet-spel contexten om motivatie en betrokkenheid te verhogen. In het onderwijs kan dit leiden tot verhoogde participatie, beter onthouden van informatie en meer plezier in het leerproces.

Spelelementen die gebruikt kunnen worden:
• Punten en beloningssystemen
• Levels en progressie-indicatoren
• Badges en achievements
• Leaderboards en competitie
• Verhaallijnen en karakters
• Uitdagingen en quests

Het is belangrijk om gamification zorgvuldig te implementeren zodat het de intrinsieke motivatie ondersteunt in plaats van ondermijnt.',
  'https://vimeo.com/345678901',
  'https://vimeo.com/765432109',
  '[
    {"title": "Gamification Toolkit", "url": "https://www.gamification.org/education"},
    {"title": "Kahoot! Platform", "url": "https://kahoot.com"}
  ]'::jsonb,
  (SELECT id FROM profiles LIMIT 1),
  true
),
(
  'Mindfulness in de Klas',
  'Rust en focus voor betere prestaties',
  'Mindfulness technieken helpen leerlingen om hun aandacht te trainen, stress te verminderen en emotionele regulatie te verbeteren. Dit leidt tot een betere leeromgeving en verbeterde academische prestaties.

Praktische oefeningen:
• Ademhalingsoefeningen (2-3 minuten)
• Body scan meditatie
• Mindful luisteren
• Dankbaarheidsoefeningen
• Aandachtstraining
• Emotie-herkenning

Deze technieken kunnen geïntegreerd worden in de dagelijkse routine en zijn geschikt voor alle leeftijden, van basisschool tot voortgezet onderwijs.',
  'https://vimeo.com/456789012',
  'https://vimeo.com/654321098',
  '[
    {"title": "Mindfulness in Schools", "url": "https://www.mindfulschools.org"},
    {"title": "Nederlandse Mindfulness Gids", "url": "https://www.mindfulness.nl/onderwijs"}
  ]'::jsonb,
  (SELECT id FROM profiles LIMIT 1),
  true
),
(
  'Gedifferentieerd Onderwijs',
  'Onderwijs op maat voor elke leerling',
  'Gedifferentieerd onderwijs erkent dat leerlingen verschillende behoeften, interesses en leerstijlen hebben. Door het aanpassen van inhoud, proces en product kunnen alle leerlingen optimaal leren en groeien.

Differentiatie strategieën:
• Inhoud: Verschillende bronnen en complexiteitsniveaus
• Proces: Variatie in instructiemethoden en activiteiten
• Product: Verschillende manieren om kennis te demonstreren
• Leeromgeving: Flexibele groepering en werkplekken

Effectieve differentiatie vereist goede kennis van je leerlingen en flexibiliteit in je onderwijsaanpak.',
  'https://vimeo.com/567890123',
  'https://vimeo.com/543210987',
  '[
    {"title": "Differentiatie Strategieën", "url": "https://www.differentiatedinstruction.com"},
    {"title": "Praktische Voorbeelden", "url": "https://www.onderwijsinspectie.nl/differentiatie"}
  ]'::jsonb,
  (SELECT id FROM profiles LIMIT 1),
  true
);

-- Get the technique IDs for associations
DO $$
DECLARE
    coop_id uuid;
    flipped_id uuid;
    gamification_id uuid;
    mindfulness_id uuid;
    differentiated_id uuid;
    
    primary_id uuid;
    secondary_id uuid;
    mbo_id uuid;
    
    nederlands_id uuid;
    wiskunde_id uuid;
    engels_id uuid;
    geschiedenis_id uuid;
    
    whiteboard_id uuid;
    laptop_id uuid;
    spelmateriaal_id uuid;
    boeken_id uuid;
BEGIN
    -- Get technique IDs
    SELECT id INTO coop_id FROM teaching_techniques WHERE title = 'Coöperatief Leren';
    SELECT id INTO flipped_id FROM teaching_techniques WHERE title = 'Flipped Classroom';
    SELECT id INTO gamification_id FROM teaching_techniques WHERE title = 'Gamification in het Onderwijs';
    SELECT id INTO mindfulness_id FROM teaching_techniques WHERE title = 'Mindfulness in de Klas';
    SELECT id INTO differentiated_id FROM teaching_techniques WHERE title = 'Gedifferentieerd Onderwijs';
    
    -- Get age group IDs
    SELECT id INTO primary_id FROM age_groups WHERE name = 'Basisonderwijs';
    SELECT id INTO secondary_id FROM age_groups WHERE name = 'Voortgezet onderwijs';
    SELECT id INTO mbo_id FROM age_groups WHERE name = 'MBO';
    
    -- Get subject IDs
    SELECT id INTO nederlands_id FROM subjects WHERE name = 'Nederlands';
    SELECT id INTO wiskunde_id FROM subjects WHERE name = 'Wiskunde';
    SELECT id INTO engels_id FROM subjects WHERE name = 'Engels';
    SELECT id INTO geschiedenis_id FROM subjects WHERE name = 'Geschiedenis';
    
    -- Get material IDs
    SELECT id INTO whiteboard_id FROM materials WHERE name = 'Whiteboard';
    SELECT id INTO laptop_id FROM materials WHERE name = 'Laptop/Computer';
    SELECT id INTO spelmateriaal_id FROM materials WHERE name = 'Spelmateriaal';
    SELECT id INTO boeken_id FROM materials WHERE name = 'Boeken/Werkboeken';
    
    -- Coöperatief Leren associations
    IF coop_id IS NOT NULL THEN
        INSERT INTO teaching_technique_age_groups (technique_id, age_group_id) VALUES 
            (coop_id, primary_id), (coop_id, secondary_id);
        INSERT INTO teaching_technique_subjects (technique_id, subject_id) VALUES 
            (coop_id, nederlands_id), (coop_id, wiskunde_id), (coop_id, geschiedenis_id);
        INSERT INTO teaching_technique_materials (technique_id, material_id) VALUES 
            (coop_id, whiteboard_id), (coop_id, spelmateriaal_id);
    END IF;
    
    -- Flipped Classroom associations
    IF flipped_id IS NOT NULL THEN
        INSERT INTO teaching_technique_age_groups (technique_id, age_group_id) VALUES 
            (flipped_id, secondary_id), (flipped_id, mbo_id);
        INSERT INTO teaching_technique_subjects (technique_id, subject_id) VALUES 
            (flipped_id, wiskunde_id), (flipped_id, engels_id);
        INSERT INTO teaching_technique_materials (technique_id, material_id) VALUES 
            (flipped_id, laptop_id);
    END IF;
    
    -- Gamification associations
    IF gamification_id IS NOT NULL THEN
        INSERT INTO teaching_technique_age_groups (technique_id, age_group_id) VALUES 
            (gamification_id, primary_id), (gamification_id, secondary_id);
        INSERT INTO teaching_technique_subjects (technique_id, subject_id) VALUES 
            (gamification_id, wiskunde_id), (gamification_id, engels_id);
        INSERT INTO teaching_technique_materials (technique_id, material_id) VALUES 
            (gamification_id, laptop_id), (gamification_id, spelmateriaal_id);
    END IF;
    
    -- Mindfulness associations
    IF mindfulness_id IS NOT NULL THEN
        INSERT INTO teaching_technique_age_groups (technique_id, age_group_id) VALUES 
            (mindfulness_id, primary_id), (mindfulness_id, secondary_id), (mindfulness_id, mbo_id);
        INSERT INTO teaching_technique_subjects (technique_id, subject_id) VALUES 
            (mindfulness_id, nederlands_id);
        INSERT INTO teaching_technique_materials (technique_id, material_id) VALUES 
            (mindfulness_id, whiteboard_id);
    END IF;
    
    -- Gedifferentieerd Onderwijs associations
    IF differentiated_id IS NOT NULL THEN
        INSERT INTO teaching_technique_age_groups (technique_id, age_group_id) VALUES 
            (differentiated_id, primary_id), (differentiated_id, secondary_id);
        INSERT INTO teaching_technique_subjects (technique_id, subject_id) VALUES 
            (differentiated_id, nederlands_id), (differentiated_id, wiskunde_id), (differentiated_id, engels_id);
        INSERT INTO teaching_technique_materials (technique_id, material_id) VALUES 
            (differentiated_id, boeken_id), (differentiated_id, laptop_id);
    END IF;
END $$;