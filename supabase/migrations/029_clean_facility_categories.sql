UPDATE facility_master
SET category = 'room'
WHERE category IN ('electronics', 'bathroom', 'furniture');

UPDATE facility_master
SET category = 'general'
WHERE category IN ('shared', 'connectivity');

UPDATE facility_master
SET category = 'room'
WHERE name IN ('Jendela', 'Balkon');

UPDATE facility_master
SET category = 'general'
WHERE category NOT IN ('room', 'general');
