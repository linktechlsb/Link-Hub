-- ============================================================
-- Link Leagues — Importação de Membros Semestre 26.1
-- ============================================================
-- Senha inicial: PrimeiroNome_NomeDaLiga_123
--   Exemplo: Adriano_Agro_123 | Luiza_Real State_123
-- Membros em múltiplas ligas: senha gerada pela primeira liga na lista
-- Membros já existentes são ignorados (ON CONFLICT / WHERE NOT EXISTS)
--
-- ATENÇÃO: Verifique se os nomes das ligas abaixo correspondem
-- (sem case) aos cadastrados na tabela `ligas`:
--   Agro | Real State | Art Department | Bold Minds
--   Boots In Business | LinkTech | Beauty Club
-- ============================================================

BEGIN;

-- -----------------------------------------------------------------
-- Etapa 1: Tabela temporária com todos os membros
-- -----------------------------------------------------------------
CREATE TEMP TABLE _membros_raw (
  id        SERIAL PRIMARY KEY,
  nome      TEXT NOT NULL,
  email     TEXT NOT NULL,
  liga_nome TEXT NOT NULL,
  cargo     TEXT NOT NULL
);

INSERT INTO _membros_raw (nome, email, liga_nome, cargo) VALUES
-- === AGRO ===
('Adriano Rabelo de Rezende Filho',          'adriano.rezende@aluno.lsb.com.br',    'Agro',              'Membro'),
('Beatriz Ferrari Sansone',                  'beatriz.sansone@aluno.lsb.com.br',    'Agro',              'Membro'),
('Bruno Martins Arantes',                    'bruno.martins@aluno.lsb.edu.br',      'Agro',              'Membro'),
('Caio Yan Correa Schimidt',                 'caio.schimidt@aluno.lsb.com.br',      'Agro',              'Membro'),
('Carolina Sarto Danelon',                   'carolina.danelon@aluno.lsb.edu.br',   'Agro',              'Membro'),
('Clara Maria Nogueira',                     'clara.nogueira@aluno.lsb.com.br',     'Agro',              'Membro'),
('Fernanda Bertelli Alves',                  'fernanda.alves@aluno.lsb.com.br',     'Agro',              'Líder'),
('Frederico Andrade Miyamoto',               'frederico.miyamoto@aluno.lsb.com.br', 'Agro',              'Membro'),
('Guilherme Strobel Barbosa',                'guilherme.strobel@aluno.lsb.com.br',  'Agro',              'Membro'),
('Gustavo Martins de Andrade',               'gustavo.andrade@aluno.lsb.edu.br',    'Agro',              'Membro'),
('Higor Brunetta da Silva',                  'higor.silva@aluno.lsb.com.br',        'Agro',              'Membro'),
('Igor José Gonçalves Martins',              'igor.martins@aluno.lsb.com.br',       'Agro',              'Membro'),
('Isabela Lara Nogueira Facchini',           'isabela.facchini@aluno.lsb.com.br',   'Agro',              'Líder'),
('Jhonny Gondim Corrêa',                     'jhonny.correa@aluno.lsb.com.br',      'Agro',              'Membro'),
('João Paulo Zago Meurer',                   'joao.meurer@aluno.lsb.com.br',        'Agro',              'Membro'),
('Leonardo Hirt Cavalca',                    'leonardo.cavalca@aluno.lsb.com.br',   'Agro',              'Membro'),
('Luis Guilherme Youssef Coutinho',          'luis.coutinho@aluno.lsb.com.br',      'Agro',              'Membro'),
('Luisa Campos Carregal',                    'luisa.carregal@aluno.lsb.com.br',     'Agro',              'Membro'),
('Maíra Matteo Merlo Selos Ferreira',        'maira.ferreira@aluno.lsb.com.br',     'Agro',              'Membro'),
('Manuella Araujo de Morais Borba',          'manuella.borba@aluno.lsb.com.br',     'Agro',              'Membro'),
('Maria Eduarda Fagnani Kreibich',           'maria.kreibich@aluno.lsb.com.br',     'Agro',              'Membro'),
('Marielly de Moura Silva',                  'marielly.silva@aluno.lsb.com.br',     'Agro',              'Membro'),
('Marianna Mota Lima',                       'marianna.lima@aluno.lsb.com.br',      'Agro',              'Membro'),
('Marisa de Carvalho Rodrigues',             'marisa.rodrigues@aluno.lsb.com.br',   'Agro',              'Membro'),
('Mateus Taugen Dias',                       'mateus.dias@aluno.lsb.com.br',        'Agro',              'Líder'),
('Nicolas da Silva Zanchet',                 'nicolas.zanchet@aluno.lsb.edu.br',    'Agro',              'Membro'),
('Pedro Augusto Bicalho de Alencar Horto',   'pedro.horto@aluno.lsb.com.br',        'Agro',              'Membro'),
('Pedro Cruz Nogueira',                      'pedro.nogueira@aluno.lsb.com.br',     'Agro',              'Membro'),
('Rafael Ferreira Rezende Antunes',          'rafael.antunes@aluno.lsb.com.br',     'Agro',              'Membro'),
('Rafaella Fritsch Vanzella',                'rafaella.vanzella@aluno.lsb.com.br',  'Agro',              'Membro'),
('Rebeca Figueredo da Silva Pereira',        'rebeca.pereira@aluno.lsb.com.br',     'Agro',              'Líder'),
('Roberta Judá Jacob',                       'roberta.jacob@aluno.lsb.edu.br',      'Agro',              'Membro'),
('Rodrigo Lopes Corbett Filho',              'rodrigo.corbett@aluno.lsb.com.br',    'Agro',              'Membro'),
('Victor Henrique Meneguetti',               'victor.meneguetti@aluno.lsb.com.br',  'Agro',              'Membro'),
('Vinicius Urias Ventura Bica',              'vinicius.bica@aluno.lsb.com.br',      'Agro',              'Membro'),

-- === REAL STATE ===
('Henrique Silvestre Duarte',                'henrique.duarte@aluno.lsb.com.br',    'Real State',        'Membro'),
('Miguel de Deus Perez',                     'miguel.perez@aluno.lsb.com.br',       'Real State',        'Membro'),
('Gabriel Cochrane Miele',                   'gabriel.miele@aluno.lsb.com.br',      'Real State',        'Membro'),
('Henry Padoveze Camozzi',                   'henry.camossi@aluno.lsb.com.br',      'Real State',        'Membro'),
('João Pedro Stoll Gonçalves',               'joao.goncalves@aluno.lsb.com.br',     'Real State',        'Membro'),
('João Pedro Andrade Valera',                'joao.valera@aluno.lsb.com.br',        'Real State',        'Membro'),
('Luca Maia Scoralick',                      'luca.scoralick@aluno.lsb.com.br',     'Real State',        'Membro'),
('Henrique Wrobel Maffia Rezende',           'henrique.wrobel@aluno.lsb.com.br',    'Real State',        'Membro'),
('Eduarda Bonetto Santana',                  'eduarda.santana@aluno.lsb.com.br',    'Real State',        'Membro'),
('Maria Eduarda Motta',                      'maria.motta@aluno.lsb.com.br',        'Real State',        'Membro'),
('Luiza Loureiro Neves',                     'luiza.neves@aluno.lsb.com.br',        'Real State',        'Líder'),
('Marcos Luiz de Oliveira Filho',            'marcos.oliveira@aluno.lsb.com.br',    'Real State',        'Membro'),
('Lucas Zambon Pacheco',                     'lucas.zambon@aluno.lsb.com.br',       'Real State',        'Líder'),
('Felipe Fernandes Meda',                    'felipe.meda@aluno.lsb.com.br',        'Real State',        'Membro'),
('Cesar Dei Santi Filho',                    'cesar.filho@aluno.lsb.com.br',        'Real State',        'Membro'),
('Bruno Malacaria Trolezi',                  'bruno.trolezi@aluno.lsb.com.br',      'Real State',        'Membro'),
('José Guilherme Santos Belini',             'jose.belini@aluno.lsb.com.br',        'Real State',        'Membro'),
('João Ribeiro Mendes Ranauro',              'joao.ranauro@aluno.lsb.com.br',       'Real State',        'Membro'),
('Lucas Toscano Pereira Henriques Ribeiro',  'lucas.ribeiro@aluno.lsb.com.br',      'Real State',        'Membro'),
('Karen Pereira de Farias Silva',            'karen.silva@aluno.lsb.edu.br',        'Real State',        'Membro'),

-- === ART DEPARTMENT ===
('Isabela Baycsi Serafim Ribeiro',           'isabela.serafim@aluno.lsb.edu.br',    'Art Department',    'Membro'),
('João Gabriel Brunheroto',                  'joao.brunheroto@aluno.lsb.com.br',    'Art Department',    'Membro'),
('Letícia de Sá Claro de Oliveira',          'leticia.oliveira@aluno.lsb.edu.br',   'Art Department',    'Membro'),
('Luísa Mathey Settanni',                    'luisa.settanni@aluno.lsb.edu.br',     'Art Department',    'Membro'),
('Luiza Canho Galleazzi',                    'luiza.galleazzi@aluno.lsb.com.br',    'Art Department',    'Membro'),
('Maria Eduarda Motta',                      'maria.motta@aluno.lsb.com.br',        'Art Department',    'Membro'),
('Miguel Bandeira Duarte',                   'miguel.duarte@aluno.lsb.com.br',      'Art Department',    'Membro'),
('Yasmin Akemi Masuda e Silva',              'yasmin.silva@aluno.lsb.edu.br',       'Art Department',    'Membro'),
('Marco Antonio Braide Maciel',              'marco.maciel@aluno.lsb.com.br',       'Art Department',    'Líder'),
('Enzo Maia Agostini',                       'enzo.agostini@aluno.lsb.com.br',      'Art Department',    'Líder'),
('Eduarda Baiotto',                          'eduarda.baiotto@aluno.lsb.com.br',    'Art Department',    'Membro'),

-- === BOLD MINDS ===
('Beatriz Caldeira Dinelli',                 'beatriz.dinelli@aluno.lsb.com.br',    'Bold Minds',        'Trainee'),
('Carolina Monteiro Moreira de Moraes',      'carolina.moraes@aluno.lsb.com.br',    'Bold Minds',        'Trainee'),
('Chiara Saint Falbo Scalett Rodrigues',     'chiara.rodrigues@aluno.lsb.edu.br',   'Bold Minds',        'Trainee'),
('Jhonny Gondim Corrêa',                     'jhonny.correa@aluno.lsb.com.br',      'Bold Minds',        'Trainee'),
('João Pedro Martins Perez',                 'joao.martins@aluno.lsb.edu.br',       'Bold Minds',        'Trainee'),
('Kevin Garcia Souza',                       'kevin.souza@aluno.lsb.com.br',        'Bold Minds',        'Trainee'),
('Leticia Muniz Koerner',                    'leticia.koerner@aluno.lsb.edu.br',    'Bold Minds',        'Trainee'),
('Luiza Oliveira Lacerda Infante',           'luiza.lacerda@aluno.lsb.com.br',      'Bold Minds',        'Trainee'),
('Otávio Semensato Barbosa',                 'otavio.barbosa@aluno.lsb.com.br',     'Bold Minds',        'Trainee'),
('Rafael Macedo Jacques',                    'rafael.jacques@aluno.lsb.com.br',     'Bold Minds',        'Trainee'),
('Isabela Ortunho Sliesoraitis',             'isabela.sliesoraitis@aluno.lsb.com.br','Bold Minds',       'Conselho'),
('Davi Belini Dip',                          'davi.dip@aluno.lsb.com.br',           'Bold Minds',        'Membro'),
('Liv Nakashima Figueiredo',                 'liv.figueiredo@aluno.lsb.com.br',     'Bold Minds',        'Membro'),
('Rafaely Meira',                            'rafaely.meira@aluno.lsb.com.br',      'Bold Minds',        'Membro'),
('Thaís Matos Raposo',                       'thais.raposo@aluno.lsb.com.br',       'Bold Minds',        'Membro'),
('Isabella Mendonça José de Ramalho',        'isabella.ramalho@aluno.lsb.com.br',   'Bold Minds',        'Head'),
('Isadora Bertotti Gonçalves',               'isadora.bertotti@aluno.lsb.com.br',   'Bold Minds',        'Head'),
('Laura Inácio Farias Britto',               'laura.britto@aluno.lsb.com.br',       'Bold Minds',        'Líder'),
('Laura Guimarães Assunção',                 'laura.assuncao@aluno.lsb.com.br',     'Bold Minds',        'Head'),
('Letícia Guimarães de Oliveira Crnkovic',   'leticia.crnkovic@aluno.lsb.com.br',   'Bold Minds',        'Líder'),
('Lucas Moujaes Promicia',                   'lucas.promicia@aluno.lsb.com.br',     'Bold Minds',        'Líder'),

-- === BOOTS IN BUSINESS ===
('Maria Cecília Cosentino Farias',           'maria.farias@aluno.lsb.com.br',       'Boots In Business', 'Conselho'),
('Valentina Fernandes Simoes Vieira',        'valentina.vieira@aluno.lsb.com.br',   'Boots In Business', 'Conselho'),
('Beatriz Soares Brisola',                   'beatriz.brisola@aluno.lsb.com.br',    'Boots In Business', 'Líder'),
('Isabela Lautenschlaeger Vaz',              'isabela.vaz@aluno.lsb.com.br',        'Boots In Business', 'Líder'),
('Giovana Bilibio Brugnera',                 'giovana.brugnera@aluno.lsb.com.br',   'Boots In Business', 'Membro'),
('Maria Eduarda Cerqueira Barreto',          'maria.barreto@aluno.lsb.com.br',      'Boots In Business', 'Membro'),
('Maitê Pizza Lemos',                        'maite.lemos@aluno.lsb.edu.br',        'Boots In Business', 'Membro'),
('Ana Luiza Beazim Julio',                   'ana.julio@aluno.lsb.edu.br',          'Boots In Business', 'Membro'),
('Fernanda Mastro e Silva',                  'fernanda.mastro@aluno.lsb.edu.br',    'Boots In Business', 'Membro'),
('Isabela Vieira Crosara',                   'isabela.crosara@aluno.lsb.com.br',    'Boots In Business', 'Membro'),
('Maria Clara Macedo Willers',               'maria.willers@aluno.lsb.edu.br',      'Boots In Business', 'Membro'),
('Luiza Emmerich Barbosa',                   'luiza.barbosa@aluno.lsb.com.br',      'Boots In Business', 'Membro'),
('Lucas Melo Mejorado Escobar',              'lucas.escobar@aluno.lsb.com.br',      'Boots In Business', 'Membro'),
('Vinícius Vacchiano Silva',                 'vinicius.vacchiano@aluno.lsb.edu.br', 'Boots In Business', 'Membro'),
('Maria Leopoldina Capobianco Corte',        'maria.corte@aluno.lsb.com.br',        'Boots In Business', 'Membro'),
('Amanda Miró Fernandez',                    'amanda.fernandez@aluno.lsb.com.br',   'Boots In Business', 'Membro'),
('Andressa Pereira Vaquero Cobianchi',       'andressa.cobianchi@aluno.lsb.com.br', 'Boots In Business', 'Membro'),

-- === LINKTECH ===
('Carolina Guimarães Campos de Oliveira',    'carolina.oliveira@aluno.lsb.com.br',  'LinkTech',          'Membro'),
('João Pedro Mourão e Souza',                'joao.mourao@aluno.lsb.com.br',        'LinkTech',          'Membro'),
('Lorenzo Vitti Dorizotto',                  'lorenzo.dorizotto@aluno.lsb.com.br',  'LinkTech',          'Membro'),
('Felipe Argolo Assis',                      'felipe.assis@aluno.lsb.com.br',       'LinkTech',          'Líder'),
('Diogo Chiapeta Garcia',                    'diogo.garcia@aluno.lsb.com.br',       'LinkTech',          'Líder'),

-- === BEAUTY CLUB ===
('Mylla Martins Marrão',                     'mylla.marrao@aluno.lsb.com.br',       'Beauty Club',       'Trainee'),
('Isadora Grings Nogueira',                  'isadora.nogueira@aluno.lsb.com.br',   'Beauty Club',       'Trainee'),
('Maria Clara Macedo Willers',               'maria.willers@aluno.lsb.edu.br',      'Beauty Club',       'Trainee'),
('Clarice Miranda Beltrame',                 'clarice.beltrame@aluno.lsb.edu.br',   'Beauty Club',       'Trainee'),
('Maria Luiza Duarte Volpe',                 'maria.volpe@aluno.lsb.edu.br',        'Beauty Club',       'Trainee'),
('Bianca Isola Ortiz',                       'bianca.ortiz@aluno.lsb.edu.br',       'Beauty Club',       'Trainee'),
('Mateus Alcântara de Matos Silva',          'mateus.matos@aluno.lsb.edu.br',       'Beauty Club',       'Trainee'),
('Ana Luiza Beazim Julio',                   'ana.julio@aluno.lsb.edu.br',          'Beauty Club',       'Trainee'),
('Martha Moraes',                            'martha.moraes@aluno.lsb.edu.br',      'Beauty Club',       'Trainee'),
('Sumaya Samed Saab',                        'sumaya.saab@aluno.lsb.edu.br',        'Beauty Club',       'Trainee'),
('Maria Eduarda Machado Vittori',            'maria.vituri@aluno.lsb.com.br',       'Beauty Club',       'Membro'),
('Joana Carneiro da Cunha Gionco',           'joana.gionco@aluno.lsb.com.br',       'Beauty Club',       'Membro'),
('Júlia Segamarchi Pereira',                 'julia.pereira@aluno.lsb.com.br',      'Beauty Club',       'Membro'),
('Eduarda Baiotto',                          'eduarda.baiotto@aluno.lsb.com.br',    'Beauty Club',       'Membro'),
('Nina Kouri Lopes',                         'nina.lopes@aluno.lsb.com.br',         'Beauty Club',       'Membro'),
('Camila Gurgel Giacomo',                    'camila.giacomo@aluno.lsb.com.br',     'Beauty Club',       'Membro'),
('Natalia Milharezi Abud Martins',           'natalia.martins@aluno.lsb.com.br',    'Beauty Club',       'Líder'),
('Isabelli Anastacio Ventura',               'isabelli.ventura@aluno.lsb.com.br',   'Beauty Club',       'Líder'),
('Thaís Matos Raposo',                       'thais.raposo@aluno.lsb.com.br',       'Beauty Club',       'Líder'),
('Michelle Jancar Jomaa',                    'michelle.jomaa@aluno.lsb.com.br',     'Beauty Club',       'Líder'),
('Larissa Tavares Ferreira',                 'larissa.ferreira@aluno.lsb.com.br',   'Beauty Club',       'Líder'),
('Paolla Oliveira Dorgam',                   'paolla.dorgam@aluno.lsb.com.br',      'Beauty Club',       'Líder');


-- -----------------------------------------------------------------
-- Etapa 2: Criar usuários no Supabase Auth (pular existentes)
-- Senha: PrimeiroNome_Liga_123  usando a primeira liga da lista
--   Membros em múltiplas ligas:
--     jhonny.correa        → Jhonny_Agro_123
--     maria.motta          → Maria_Real_State_123
--     eduarda.baiotto      → Eduarda_Art_Department_123
--     thais.raposo         → Thaís_Bold_Minds_123
--     ana.julio            → Ana_Boots_In_Business_123
--     maria.willers        → Maria_Boots_In_Business_123
-- -----------------------------------------------------------------
WITH primeiros AS (
  SELECT DISTINCT ON (email)
    nome,
    email,
    liga_nome,
    split_part(nome, ' ', 1) || '_' || REPLACE(liga_nome, ' ', '_') || '_123' AS senha_plain
  FROM _membros_raw
  ORDER BY email, id          -- id SERIAL garante ordem de inserção
)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
SELECT
  '00000000-0000-0000-0000-000000000000'::UUID,
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  p.email,
  crypt(p.senha_plain, gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('role', 'membro', 'nome', p.nome),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
FROM primeiros p
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au WHERE au.email = p.email
);


-- -----------------------------------------------------------------
-- Etapa 3: Criar registros em public.usuarios (pular existentes)
-- -----------------------------------------------------------------
WITH primeiros AS (
  SELECT DISTINCT ON (email)
    nome,
    email
  FROM _membros_raw
  ORDER BY email, id
)
INSERT INTO public.usuarios (id, email, nome, role)
SELECT
  au.id,
  p.email,
  p.nome,
  'membro'::user_role
FROM primeiros p
JOIN auth.users au ON au.email = p.email
WHERE NOT EXISTS (
  SELECT 1 FROM public.usuarios u WHERE u.email = p.email
);


-- -----------------------------------------------------------------
-- Etapa 4: Vincular membros às ligas (pular vínculos existentes)
-- -----------------------------------------------------------------
INSERT INTO public.liga_membros (liga_id, usuario_id, cargo)
SELECT
  l.id,
  u.id,
  m.cargo
FROM _membros_raw m
JOIN public.ligas    l ON LOWER(TRIM(l.nome))  = LOWER(TRIM(m.liga_nome))
JOIN public.usuarios u ON u.email = m.email
WHERE NOT EXISTS (
  SELECT 1
  FROM public.liga_membros lm
  WHERE lm.liga_id = l.id AND lm.usuario_id = u.id
);


DROP TABLE _membros_raw;

COMMIT;


-- -----------------------------------------------------------------
-- Verificação (execute separadamente após o COMMIT para confirmar)
-- -----------------------------------------------------------------
-- SELECT l.nome AS liga, COUNT(*) AS total_membros
-- FROM public.liga_membros lm
-- JOIN public.ligas l ON l.id = lm.liga_id
-- GROUP BY l.nome
-- ORDER BY l.nome;
--
-- Resultados esperados aproximados:
--   Agro              → 35
--   Art Department    → 11
--   Beauty Club       → 22
--   Bold Minds        → 21
--   Boots In Business → 17
--   LinkTech          →  5
--   Real State        → 20
