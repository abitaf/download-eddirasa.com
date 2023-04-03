const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const url = require('url');
const axiosRetry = require('axios-retry');

// URL de la page à scraper
const page = 'https://eddirasa.com/ens-cm/4am/maths/';
const downloadDirectory = './downloads';
if (!fs.existsSync(downloadDirectory)) {
  fs.mkdirSync(downloadDirectory);
}

// Fonction pour télécharger le fichier PDF à partir d'un lien href
const downloadPdf = async (pdfUrl) => {
  const parsedUrl = url.parse(pdfUrl);
  const pathname = parsedUrl.pathname;
  const filename = pathname.split('/').pop();

  const filePath = path.join(downloadDirectory, filename);

  if (fs.existsSync(filePath)) {
    console.log(`File ${filename} already exists.`);
    return;
  }

  let response = null;
  try {
    response = await axios({
      method: 'GET',
      url: pdfUrl,
      responseType: 'arraybuffer',
    });
  } catch (error) {}

  const isDataAvailable = response?.data && response.data.length;
  if (!isDataAvailable) {
    console.log(`Error downloading file "${filename}"`);
    return;
  }

  fs.writeFile(filePath, response.data, 'binary', (err) => {
    if (err) console.log(`Error saving file "${filename}"`);
    console.log(`${filename} file has been saved!`);
  });
};

// Fonction principale de scraping
const scrape = async () => {
  try {
    axiosRetry(axios, {
      retries: 3,
      retryDelay: (retryCount) => retryCount * 1000,
      shouldResetTimeout: true,
    });

    const response = await axios.get(page);
    const $ = cheerio.load(response.data);

    // Extraire tous les liens href avec la classe "btn btn-outline-secondary"
    const links = $('.item-list-exams a.btn.btn-outline-secondary');

    // Boucle à travers tous les liens extraits
    for (let i = 0; i < links.length; i++) {
      const link = links[i];

      // Visiter chaque lien et extraire le lien href du fichier PDF
      const linkResponse = await axios.get($(link).attr('href'));
      const link$ = cheerio.load(linkResponse.data);
      const pdfLink = link$('.btn.btn-danger').attr('href');
      if (!pdfLink) continue;
      // Télécharger le fichier PDF
      if (pdfLink.length > page.length) await downloadPdf(pdfLink);
    }
  } catch (error) {
    console.error(error);
  }
};

scrape();
