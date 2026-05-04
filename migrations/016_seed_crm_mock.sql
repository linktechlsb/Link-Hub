-- Dados mockados para teste do CRM (remover após validação)

DO $$
DECLARE
  liga RECORD;
BEGIN
  FOR liga IN SELECT id FROM ligas WHERE ativo = true LOOP

    INSERT INTO crm_contatos (liga_id, nome, emprego, empresa, telefone, email) VALUES
      (liga.id, 'Ana Beatriz Oliveira',    'Gerente de Parcerias',      'Grupo Votorantim', '(11) 91234-5678', 'ana.oliveira@votorantim.com.br'),
      (liga.id, 'Carlos Eduardo Mendes',   'Diretor Comercial',         'BTG Pactual',      '(11) 99876-5432', 'carlos.mendes@btgpactual.com'),
      (liga.id, 'Fernanda Costa',          'Coordenadora de RH',        'Ambev',            '(21) 98765-4321', 'fernanda.costa@ambev.com.br'),
      (liga.id, 'Rafael Souza',            'Analista de Investimentos',  'XP Investimentos', '(11) 97654-3210', 'rafael.souza@xpi.com.br');

  END LOOP;
END;
$$;
