"""Build a conservative, reproducible author index from the supplied catalog."""

import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "author-linking"
OUT.mkdir(exist_ok=True)
with (ROOT / "chornomorska-catalog.csv").open(encoding="utf-8-sig") as source_file:
    rows = list(csv.DictReader(source_file))


def split_names(value):
    return [line.strip() for line in value.splitlines() if line.strip()]


# Canonical labels clarified by the owner in the 2026-11-11 sheet export.
AUTHOR_NAME_CORRECTIONS = {
    "Борискин А.И.": "Борискін Олександр",
    "Денисов Д.О.": "Денисов Денис",
    "Захматов В.Д.": "Захматов Володимир",
    "П'ятова А.В.": "Пятова Анжела",
    "Щербак Н.В.": "Щербак Микола",
    "Загороднюк П.А.": "Загороднюк Павло",
    "Артеменко В.М.": "Артеменко Володимир",
    "Мельник И.В.": "Мельник Ігор",
    "Омелянська О.С.": "Омелянська Ольга",
    "Івлетшин Д.": "Івлетшин Дамір",
    "Тейлор У.Б.": "Тейлор Вільям",
    "Манрінг Н.Дж.": "Манрінг Ніколас",
    "Ехманн К.": "Ехманн Клер",
    "Кисельов С.": "Кисельов Сергій",
    "Бутенко М.П.": "Бутенко Микола",
    "Россоха Людмила": "Рассоха Людмила",
    "Алібейлі Г.Дж.": "Алібейлі Гасан",
    "Аббасли А.І.": "Аббасли Айсель",
    "Барановська В.М.": "Барановська Віра",
    "Поблє Дмитро": "Побле Дмитро",
    "Глєбов С.": "Глебов Сергій",
}

mapping = {}
evidence = {}


def link(alias, canonical_name, reason):
    canonical_name = AUTHOR_NAME_CORRECTIONS.get(canonical_name, canonical_name)
    if alias in mapping and mapping[alias] != canonical_name:
        raise ValueError((alias, mapping[alias], canonical_name))
    mapping[alias] = canonical_name
    evidence[alias] = reason


for previous_name, corrected_name in AUTHOR_NAME_CORRECTIONS.items():
    link(
        previous_name,
        corrected_name,
        "Уточнення імені власником каталогу; експорт 2026-11-11",
    )


# A single name and a single name-tag are equivalences except the distinct
# people explicitly confirmed by the catalog owner below.
for source_row, row in enumerate(rows, 2):
    author_names = split_names(row["Автор"])
    tag_names = split_names(row["Теги"])
    if row.get("Пошукові автори"):
        continue
    if len(author_names) == len(tag_names) == 1 and author_names[0] != "Рогожин Дмитро":
        if author_names[0] in ("Рассоха Людмила", "Россоха Людмила"):
            continue
        link(
            author_names[0],
            tag_names[0],
            f"Єдиний автор і варіант імені в тегах; рядок {source_row}",
        )

# Explicit mappings inspected in multi-author / multi-tag source records.
groups = {
    "Беліцер Наталя": ["Беліцер Наталія"],
    "Читадзе Ніка": ["Читадзе Ника", "Chitadze Nika"],
    "Кулик Сергій": ["Кулик Сергей"],
    "Лакійчук Павло": ["Лакийчук Павел"],
    "Штибликов Дмитро": ["Штыбликов Дмитрий"],
    "Лактіонов Олег": ["Лактионов Олег"],
    "Махоня Іван": ["Махоня Иван"],
    "П'ятова А.В.": ["Пятова А.В.", "П'ятова"],
    "Омелянська О.С.": ["Омелянская О.С."],
    "Стрілецький Олексій": ["Стрелецкий Алексей", "Стілецький Олексій"],
    "Хрієнко Павло": ["Хриенко Павел"],
    "Гаджиєв Джавід": ["Гаджиев Джавид"],
    "Лосєв Ігор": ["Лосев Игорь"],
    "Івлетшин Д.": ["Ивлетшин Д."],
    "Ісмаїлов Т.": ["Исмаилов Т."],
    "Семененко Андрій": ["Семененко Андрей"],
    "Ель-Маззега Марк Антуан": ["Eyl-Mazzega Marc-Antoine", "Эль-Маззега Марк Антуан"],
    "Тейлор У.Б.": ["Taylor William B."],
    "Манрінг Н.Дж.": ["Manring Nicholas J.", "Манринг Н.Дж.", "Манрінг Н.ДЖ"],
    "Ехманн К.": ["Ehmann Claire", "Эхманн К."],
    "Алієв Ельнур": ["Алиев Эльнур"],
    "Костенко Георгій": ["Костенко Георгий"],
    "Насіров Ельман": ["Nasirov Elman", "Насыров Эльман", "Насиров Эльман"],
    "Какачія Корнелій": ["Kakachia Kornely", "Какачия Корнелий"],
    "Гончар Михайло": ["Gonchar Michael", "Гончар Михаил"],
    "Малиновський Олександр": ["Malynovsky Olexandr"],
    "Корчмит Юрій": ["Корчмит Юрий"],
    "Леонов Олександр": ["Леонов Александр"],
    "Петров Юрій": ["Петров Юрий"],
    "Маначинський Олександр": ["Маначинский Александр", "Маначинский Аександр"],
    "Алієв Алім": ["Алиев Алим"],
    "Семиволос Ігор": ["Семиволос Игорь"],
    "Алібейлі Г.Дж.": ["Алибейли Г.Дж."],
    "Женінь Лі": ["Женинь Ли"],
    "Мамедов Рустам": ["Мамедов Р.Ф."],
    "Аббасли А.І.": ["Аббаслы А.И."],
    "Міріманова Наталія": ["Мириманова Наталия"],
    "Лукінова Анна": ["Лукинова Анна"],
    "Бессарабов Олексій": ["Бессарабов Алексей"],
    "Богомолов Олександр": ["Богомолов Александр"],
    "Данилов Сергій": ["Данилов Сергей"],
    "Муратова Ельміра": ["Муратова Эльмира"],
    "Куц Наталія": ["Куц Наталья"],
    "Паін Еміль": ["Паин Эмиль"],
    "Простаков Сергій": ["Простаков Сергей"],
    "Россоха Людмила": ["Рассоха Людмила"],
}
for canonical_name, aliases in groups.items():
    for alias in aliases:
        link(
            alias,
            canonical_name,
            "Варіант імені зіставлено за авторським полем і тегами",
        )


def resolve_name(name):
    seen = set()
    while name in mapping and mapping[name] != name:
        assert name not in seen, name
        seen.add(name)
        name = mapping[name]
    return name


# Preserve shared author URLs when correcting a canonical display name.
AUTHOR_ID_OVERRIDES = {
    "Стрілецький Олексій": "author_53a41467044d",
    "Борискін Олександр": "author_e6179958a7d8",
    "Денисов Денис": "author_28384b0190c5",
    "Захматов Володимир": "author_d5b08df2d8b9",
    "Пятова Анжела": "author_c72d66b11617",
    "Щербак Микола": "author_59c65d6daab0",
    "Загороднюк Павло": "author_9787809ddcc1",
    "Артеменко Володимир": "author_e2d58bbdf2c4",
    "Мельник Ігор": "author_c83be90119c8",
    "Омелянська Ольга": "author_7da5f743a62a",
    "Івлетшин Дамір": "author_cae16c30c889",
    "Тейлор Вільям": "author_c1326985e529",
    "Манрінг Ніколас": "author_5a0a0dcbaf44",
    "Ехманн Клер": "author_0a24a35dfea5",
    "Кисельов Сергій": "author_88f24ff5c68e",
    "Бутенко Микола": "author_c4df22029c30",
    "Рассоха Людмила": "author_d7797cfe3706",
    "Алібейлі Гасан": "author_553ec5ddbf05",
    "Аббасли Айсель": "author_634f16d9fe5f",
    "Барановська Віра": "author_b13f341a8834",
    "Побле Дмитро": "author_3399ac5ae365",
    "Глебов Сергій": "author_419f0fe4645c",
}


def author_id_for_name(name):
    if name in AUTHOR_ID_OVERRIDES:
        return AUTHOR_ID_OVERRIDES[name]
    return "author_" + hashlib.sha256(name.encode()).hexdigest()[:12]


authors = {}
review = []
articles = []
genres = {"Інтерв'ю", "Рецензія"}
distinct_people = [
    ("Рогожин Дмитро", "Майорова Аліна"),
]
# Confirmed by the catalog owner. Keep source credits and existing author IDs.
pseudonyms = [("Бессарабов Олексій", "Стрілецький Олексій")]
confirmed_distinct = {frozenset(pair) for pair in distinct_people}


def search_identity(name):
    name = resolve_name(name)
    for real_name, pseudonym in pseudonyms:
        if name == pseudonym:
            return real_name
    return name


def is_distinct_person_tag(tag, author_names):
    tag_name = resolve_name(tag)
    return any(
        frozenset((resolve_name(author_name), tag_name)) in confirmed_distinct
        for author_name in author_names
    )


def register_author(name, source_row):
    canonical_name = resolve_name(name)
    author_id = author_id_for_name(canonical_name)
    person = authors.setdefault(
        author_id,
        {"id": author_id, "name": canonical_name, "aliases": set(), "source_rows": []},
    )
    person["aliases"].update([name, canonical_name])
    person["source_rows"].append(source_row)
    return author_id


for source_row, row in enumerate(rows, 2):
    author_names = split_names(row["Автор"])
    tag_names = split_names(row["Теги"])
    search_only_names = split_names(row.get("Пошукові автори", ""))
    additional_categories = split_names(row.get("Додаткові рубрики", ""))
    author_ids = [register_author(name, source_row) for name in author_names]
    search_only_ids = [register_author(name, source_row) for name in search_only_names]

    author_identities = {
        search_identity(name) for name in author_names + search_only_names
    }
    unresolved = [
        tag
        for tag in tag_names
        if tag not in genres
        and tag not in additional_categories
        and search_identity(tag) not in author_identities
    ]
    separate_person_tags = [
        tag for tag in unresolved if is_distinct_person_tag(tag, author_names)
    ]
    unresolved = [tag for tag in unresolved if tag not in separate_person_tags]

    if not author_names:
        review.append(
            {
                "row": source_row,
                "kind": "missing_author",
                "authors": "",
                "tags": row["Теги"],
                "title": row["Назва статті"],
                "note": "Автор у реквізитах не вказаний. Пошукові зв’язки не змінюють атрибуцію.",
            }
        )

    if unresolved and author_names:
        review.append(
            {
                "row": source_row,
                "kind": "unresolved_name_tag",
                "authors": row["Автор"],
                "tags": "\n".join(unresolved),
                "title": row["Назва статті"],
                "note": "Може бути псевдонім, співрозмовник або згадана особа; авторство не встановлено.",
            }
        )

    articles.append(
        {
            "source_row": source_row,
            "title": row["Назва статті"],
            "author_ids": list(dict.fromkeys(author_ids)),
            "search_author_ids": list(dict.fromkeys(author_ids + search_only_ids)),
            "original_authors": author_names,
            "unresolved_name_tags": unresolved,
            "separate_person_tags": separate_person_tags,
            "metadata": row,
        }
    )

# Expand search identities without changing the publication's author credit.
for article in articles:
    search_ids = set(article["search_author_ids"])
    for real_name, pseudonym in pseudonyms:
        pair_ids = {author_id_for_name(real_name), author_id_for_name(pseudonym)}
        if search_ids & pair_ids:
            search_ids.update(pair_ids)
    article["search_author_ids"] = sorted(search_ids)

# Include aliases from tags even when they never appear in the author field.
for alias in mapping:
    author_id = author_id_for_name(resolve_name(alias))
    if author_id in authors:
        authors[author_id]["aliases"].add(alias)

for person in authors.values():
    person["aliases"] = sorted(person["aliases"])
    person["source_rows"] = sorted(set(person["source_rows"]))


def write_csv(filename, fields, records):
    with (OUT / filename).open("w", encoding="utf-8-sig", newline="") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(records)


alias_rows = []
for person in sorted(authors.values(), key=lambda person: person["name"]):
    for alias in person["aliases"]:
        alias_rows.append(
            {
                "author_id": person["id"],
                "canonical_name": person["name"],
                "alias": alias,
                "basis": evidence.get(alias, "Ім’я в авторському полі / основне ім’я"),
                "source_rows": ", ".join(map(str, person["source_rows"])),
            }
        )
write_csv(
    "author-aliases.csv",
    ["author_id", "canonical_name", "alias", "basis", "source_rows"],
    alias_rows,
)
write_csv(
    "needs-review.csv", ["row", "kind", "authors", "tags", "title", "note"], review
)

linked = []
for article in articles:
    linked.append(
        {
            **article["metadata"],
            "source_row": article["source_row"],
            "author_ids": "|".join(article["author_ids"]),
            "linked_author_names": "\n".join(
                authors[author_id]["name"] for author_id in article["author_ids"]
            ),
        }
    )
write_csv(
    "catalog-linked.csv",
    list(rows[0]) + ["source_row", "author_ids", "linked_author_names"],
    linked,
)
(OUT / "author-index.json").write_text(
    json.dumps(
        {
            "pseudonyms_confirmed_by_owner": pseudonyms,
            "distinct_people_confirmed_by_owner": distinct_people,
            "authors": sorted(authors.values(), key=lambda person: person["name"]),
            "articles": articles,
        },
        ensure_ascii=False,
        indent=2,
    ),
    encoding="utf-8",
)

summary = {
    "articles": len(rows),
    "author_entities": len(authors),
    "entities_with_variants": sum(
        len(person["aliases"]) > 1 for person in authors.values()
    ),
    "name_forms": len(alias_rows),
    "articles_without_explicit_author": sum(
        not article["author_ids"] for article in articles
    ),
    "articles_with_multiple_authors": sum(
        len(article["author_ids"]) > 1 for article in articles
    ),
    "review_records": len(review),
}
print(json.dumps(summary, ensure_ascii=False, indent=2))
