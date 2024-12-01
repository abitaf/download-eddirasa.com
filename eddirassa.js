const axios = require('axios')
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')
const url = require('url')
const axiosRetry = require('axios-retry').default

// URL de la page à scraper
const page = 'https://eddirasa.com/ens-cm/4am/maths/'
const downloadDirectory = './downloads'
if (!fs.existsSync(downloadDirectory)) {
  fs.mkdirSync(downloadDirectory)
}

axiosRetry(axios, {
  retries: 10,
  retryDelay: (retryCount) => retryCount * 1000,
  shouldResetTimeout: true,
  onRetry: (retryCount, error) => {
    console.log(`🔄 Retry attempt #${retryCount} for: ${decodeURI(error.config.url)}`)
  }
})

// Fonction pour télécharger le fichier PDF à partir d'un lien href
const downloadPdf = async (pdfUrl) => {
  try {
    const parsedUrl = url.parse(pdfUrl)
    const pathname = parsedUrl.pathname
    const filename = pathname.split('/').pop()

    const filePath = path.join(downloadDirectory, filename)

    if (fs.existsSync(filePath)) {
      console.log(`✅ Fichier déjà existant : ${filename}`)
      return
    }

    const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' })
    fs.writeFileSync(filePath, response.data)
    console.log(`✅ Téléchargé et sauvegardé : ${filename}`)
  } catch (error) {
    console.error(`❌ Erreur lors du téléchargement : ${pdfUrl}\n`)
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
        console.log(`🔗 Visite de : ${decodeURI(href)}`)
        const linkResponse = await axios.get(href)
        const link$ = cheerio.load(linkResponse.data)
        const pdfLink = link$('.btn.btn-danger').attr('href')

        if (pdfLink) {
          await downloadPdf(pdfLink)
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

scrape()
