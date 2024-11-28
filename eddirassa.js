const axios = require('axios')
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')
const axiosRetry = require('axios-retry').default

// Configuration
const page = 'https://eddirasa.com/ens-cm/4am/maths/'
const downloadDirectory = './downloads'

// Initialisation du répertoire de téléchargement
if (!fs.existsSync(downloadDirectory)) {
  fs.mkdirSync(downloadDirectory)
}

// Configuration d'axios-retry
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay, // Utilise un délai exponentiel pour les retries
  shouldResetTimeout: true,
  retryCondition: (error) => {
    // Retry uniquement sur erreurs réseau ou codes d'erreur spécifiques
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status >= 500
  },
  onRetry: (retryCount, error) => {
    console.log(`🔄 Retry attempt #${retryCount} for: ${error.config.url}`)
  }
})

// Fonction pour télécharger un fichier PDF
const downloadPdf = async (pdfUrl) => {
  try {
    const filename = path.basename(new URL(pdfUrl).pathname)
    const filePath = path.join(downloadDirectory, filename)

    if (fs.existsSync(filePath)) {
      console.log(`✅ Fichier déjà existant : ${filename}`)
      return
    }

    const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' })
    fs.writeFileSync(filePath, response.data)
    console.log(`✅ Téléchargé et sauvegardé : ${filename}`)
  } catch (error) {
    console.error(`❌ Erreur lors du téléchargement : ${pdfUrl}\n`, error.message)
  }
}

// Fonction principale de scraping
const scrape = async () => {
  try {
    console.log(`🔍 Récupération de la page principale : ${page}`)
    const response = await axios.get(page)
    const $ = cheerio.load(response.data)

    // Extraire tous les liens pertinents
    const links = $('.item-list-exams a.btn.btn-outline-secondary')

    for (let i = 0; i < links.length; i++) {
      const href = $(links[i]).attr('href')
      if (!href) continue

      try {
        console.log(`🔗 Visite de : ${href}`)
        const linkResponse = await axios.get(href)
        const link$ = cheerio.load(linkResponse.data)
        const pdfLink = link$('.btn.btn-danger').attr('href')

        if (pdfLink) {
          await downloadPdf(pdfLink)
        } else {
          console.log(`⚠️ Aucun lien PDF trouvé sur : ${href}`)
        }
      } catch (linkError) {
        console.error(`❌ Erreur lors de la visite du lien : ${href}\n`, linkError.message)
      }
    }
    console.log(`✅ Scraping terminé.`)
  } catch (error) {
    console.error(`❌ Erreur générale : ${error.message}`)
  }
}

// Lancer le script de scraping
scrape()
