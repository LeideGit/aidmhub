# GitHub Pages Setup för AI DM HUB

## Status: Ready to Enable ✅

Ditt repo är nu förberett för GitHub Pages. Följ dessa steg för att aktivera det:

---

## Steg-för-steg: Aktivera GitHub Pages

### 1. Gå till Repository Settings
- Öppna https://github.com/LeideGit/aidmhub
- Klicka på **Settings** (högst upp till höger)

### 2. Navigera till Pages
- I vänstra menyn, scroll ned och klicka på **Pages** (under "Code and automation")

### 3. Aktivera GitHub Pages
- Under "Build and deployment"
- **Source**: Välj **Deploy from a branch**
- **Branch**: Välj `main` från dropdown
- **Folder**: Välj `/ (root)` från andra dropdown
- Klicka **Save**

### 4. Vänta på deploy
- GitHub kommer visa en blå banner: "Your site is ready to be published at `https://leidegit.github.io/aidmhub/`"
- Efter ~1-2 minuter blir den grön: "Your site is live at `https://leidegit.github.io/aidmhub/`"

### 5. Verifiera
- Öppna https://leidegit.github.io/aidmhub/
- Du bör se AI DM HUB startsidan

---

## Vad som serveras

GitHub Pages serverar alla filer från `main` branch:

```
https://leidegit.github.io/aidmhub/                    → src/index.html
https://leidegit.github.io/aidmhub/src/app.js          → src/app.js
https://leidegit.github.io/aidmhub/src/styles.css      → src/styles.css
https://leidegit.github.io/aidmhub/src/mockData.js     → src/mockData.js
https://leidegit.github.io/aidmhub/README.md           → README.md
```

---

## Deployment Workflow

Framöver, när du gör ändringar:

1. **Commit och push** till `main` branch
   ```bash
   git add .
   git commit -m "Feature: ..."
   git push origin main
   ```

2. **GitHub Pages auto-deploy**
   - Ändringarna live inom 1-2 minuter på https://leidegit.github.io/aidmhub/

3. **Verifiera**
   - Besök sidan, tryck F5 (hard refresh med Ctrl/Cmd+Shift+R om cachad)

---

## FAQ

### Q: Varför ser jag inte uppdateringar?
A: Browser cache. Tryck **Ctrl+Shift+R** (eller Cmd+Shift+R på Mac) för hard refresh.

### Q: Kan jag använda en custom domain?
A: Ja, under Settings > Pages > Custom domain. Ej aktiv nu.

### Q: Hur länge tar deploy?
A: Vanligtvis 1-2 minuter. Se status under Settings > Pages > Deployments.

### Q: Vad gör `.nojekyll`?
A: Den säger till GitHub Pages att inte köra Jekyll (markdown processor). Korrekt för vanilla HTML/CSS/JS.

---

## Aktuell Status

✅ Repository är förberedt  
✅ `.nojekyll` är konfigurerad  
✅ Redo för GitHub Pages  

**Nästa steg:** Gå till Settings > Pages och aktivera enligt instruktionerna ovan.

---

## Links

- **Repository:** https://github.com/LeideGit/aidmhub
- **GitHub Pages URL** (när aktiverad): https://leidegit.github.io/aidmhub/
- **Settings > Pages:** https://github.com/LeideGit/aidmhub/settings/pages

---

**Dokumenterat:** 2026-10-16
