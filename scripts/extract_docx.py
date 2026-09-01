import zipfile
import re
from pathlib import Path

src = Path(r"c:\Users\User\Downloads\Direito_Constitucional_Técnico_Legislativo_SELECIONADO_7_por_tema.docx")
out = Path(r"c:\Users\User\Projetos\portal-instituto-jd\scripts\questoes_extracted.txt")

with zipfile.ZipFile(src) as z:
    xml = z.read("word/document.xml").decode("utf-8")

text = re.sub(r"</w:p>", "\n", xml)
text = re.sub(r"<w:tab[^/]*/>", "\t", text)
text = re.sub(r"<[^>]+>", "", text)
text = (
    text.replace("&amp;", "&")
    .replace("&lt;", "<")
    .replace("&gt;", ">")
    .replace("&quot;", '"')
    .replace("&#39;", "'")
)
out.write_text(text, encoding="utf-8")
print(f"wrote {out} chars={len(text)}")
