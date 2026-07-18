# Reference — old site page snapshots

Copied from the medium crawl so they show up in the repo/IDE (the full `old-site/` folder is gitignored because of large image galleries).

| Path | Contents |
|------|----------|
| `old-site-pages/` | 37 static HTML shells + 1 sample article under `samples/` |
| `INVENTORY.md` | Page list |
| `inventory-pages.csv` | CSV inventory |
| `crawl-summary.json` | Last crawl stats |

**Full raw archive (including ~46MB of assets)** still lives locally at:

```text
/Users/fredchristian/dev/wmi-web/old-site/
```

That path is gitignored. Re-copy pages after a re-crawl:

```bash
rsync -a --delete old-site/pages/ reference/old-site-pages/
cp old-site/INVENTORY.md old-site/inventory-pages.csv old-site/crawl-summary.json reference/
```
