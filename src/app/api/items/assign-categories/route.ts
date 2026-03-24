import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { isAdmin, unauthorizedResponse } from "@/lib/auth";

const CATEGORY_RULES: [RegExp, string][] = [
  [/^camera|^câmera|^cart(ões|ão) de mem|^case para cart|^limpador de cam|^mochila/i, 'Câmeras'],
  [/^lente|^adaptador|^cinto.*porta lente|^filtro/i, 'Lentes'],
  [/^flash|^kit flash|^sombrinha|^rebatedor/i, 'Iluminação'],
  [/^suporte|^monopé/i, 'Suportes e Estruturas'],
  [/^fund[ou] /i, 'Fundos Fotográficos'],
  [/^prop |^cadeira vime|^banheira|^cesto|^tina |^gamela|^baldinho|^banquinho/i, 'Props'],
  [/^painel|^mesa de vidro|^sof[aá]|^janela|^vestiário|^casinha|^cadeiras|^arara|^cômoda|^treliça/i, 'Móveis de Estúdio'],
  [/^ovos|^ovinhos|^kit páscoa|coelho|^enfeite de páscoa|^orelhinhas/i, 'Páscoa'],
  [/^body|^roupa|^romper|^vestido|^casaco|^sobreposição|^listrado|^calça|^superman|^esqueleto|^mulher maravilha|^suspensório|^fantasia|^roupinha|^ursinho fofo|^bata|^jardineira/i, 'Roupas e Fantasias'],
  [/^touca|^touquinha|^toucas|^headband|^wrap|^almofadinha|^acessórios tricot|amigurumi|feltragem|^leão|^ursinho|^ratinho|^ovelinha|^coração|^cachorrinho|^porquinho|^asinha|^avião de feltro|^bailarina|^carrossel|^arco [ií]ris|^mini elefante|^leãozinho|^cachorro branco|^almofadas|^trio de tranquilo|^lula vibe/i, 'Toucas e Acessórios Newborn'],
  [/^posicionador|^kit posicionador/i, 'Posicionadores'],
  [/^pelo|^manta|^macram[eê]|^layer|^cheesecloth|^burlap|^tecido|^flokati|^casulo de tricot|^mini manta/i, 'Mantas e Pelos'],
  [/^trio de cubos|^claquete|^escadinha|^letras|^love|^palavra|^mesinha|^boleira|^plaquinha|^plaquinhas|^cerquinha|^trio de caixote|^gavetinha|^prancha|^dupla coruja|^mini banquinho|^número|^arranjo|^bichinhos|^nuvens feltro|^lousas|^lousinha|^saco com lenha|^garrafinhas|^bandana|^caixinha de cartas/i, 'Decoração'],
];

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return unauthorizedResponse();
  }

  const db = getDb();

  const items = db
    .prepare("SELECT id, title, category FROM items WHERE category IS NULL OR category = ''")
    .all() as { id: string; title: string; category: string | null }[];

  let assigned = 0;
  const unmatchedTitles: string[] = [];
  const update = db.prepare("UPDATE items SET category = ? WHERE id = ?");

  const assignAll = db.transaction(() => {
    for (const item of items) {
      let matched = false;
      for (const [regex, category] of CATEGORY_RULES) {
        if (regex.test(item.title)) {
          update.run(category, item.id);
          assigned++;
          matched = true;
          break;
        }
      }
      if (!matched) {
        unmatchedTitles.push(item.title);
      }
    }
  });

  assignAll();

  return Response.json({
    total: items.length,
    assigned,
    unmatched: items.length - assigned,
    unmatchedTitles,
  });
}
