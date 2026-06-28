-- ============================================================
-- ServisBook - Seed Data
-- ============================================================

-- Kotle (boiler models)
INSERT INTO kotle (nazov) VALUES
  ('Protherm 12 KTZ 17'),
  ('Junkers ZSB 14'),
  ('Junkers ZSBR 28'),
  ('Buderus Logano GE434X 200'),
  ('Buderus Logano GE434X-200'),
  ('Protherm Leopard 24BTV15 - 24'),
  ('Protherm Panther 24KTO15 - 24'),
  ('Viessmann Vitodens 100 - 24'),
  ('Protherm 24KTO15 - 24'),
  ('Protherm Gepard condens 25MKV - 18'),
  ('Buderus GB022-24')
ON CONFLICT (nazov) DO NOTHING;

-- Komponenty (spare parts)
INSERT INTO komponenty (nazov) VALUES
  ('elektroda'),
  ('tesnenia'),
  ('odvzdusnovaci ventil'),
  ('sifon'),
  ('ventilator'),
  ('expanzna nadoba'),
  ('vlozka gsu'),
  ('manometer tlaku'),
  ('poistny ventil TUV'),
  ('oprava venturiho trubice'),
  ('horakove tesnenie'),
  ('expanzna nadoba TUV'),
  ('startovaci horak'),
  ('riadiaca doska - reklamacia')
ON CONFLICT (nazov) DO NOTHING;

-- Sample customers
INSERT INTO customers (nazov, ulica, mesto, tel, email, kotol, interval, sluzba) VALUES
  ('Ján Novák',       'Hlavná 12',    'Bratislava',     '0901 123 456', 'jan.novak@email.sk',   'Protherm Panther 24KTO15 - 24',      '1 rok',      'Servis'),
  ('Mária Kováčová',  'Sadová 5',     'Košice',         '0902 234 567', 'maria.kovac@email.sk', 'Junkers ZSB 14',                     '1 rok',      'Care'),
  ('Peter Horváth',   'Lúčna 33',     'Žilina',         '0903 345 678', '',                     'Buderus GB022-24',                   '2 roky',     'Servis'),
  ('Anna Slobodová',  'Záhradná 8',   'Nitra',          '0904 456 789', 'anna.slob@gmail.com',  'Viessmann Vitodens 100 - 24',        '1 rok',      'Care+'),
  ('Tomáš Blaho',     'Mlynská 17',   'Trnava',         '0905 567 890', '',                     'Protherm Gepard condens 25MKV - 18', '6 mesiacov', 'Servis'),
  ('Eva Miková',      'Krajná 2',     'Banská Bystrica','0906 678 901', 'eva.mikova@firma.sk',  'Junkers ZSBR 28',                   '1 rok',      'Care')
ON CONFLICT DO NOTHING;
