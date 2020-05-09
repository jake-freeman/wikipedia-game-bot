const fetch = require('node-fetch');
const cheerio = require('cheerio');

function makeApiLink(pageName) {
    return `https://en.wikipedia.org/api/rest_v1/page/mobile-sections/${pageName}`;
}

async function fetchArtcleText(url) {
    const res = await fetch(url);
    const json = await res.json();
    
    let sections = json.lead.sections;

    if (json.remaining && json.remaining.sections) {
        sections = sections.concat(json.remaining.sections);
    }

    sections = sections.filter((section) => {
        return section.text;
    }).filter((section) => {
        return section.anchor !== 'References' && section.anchor !== 'External_links';
    });

    const articleText = sections.reduce((acc, section) => {
        return acc + section.text;
    }, '');

    return articleText;
}

async function fetchArticleLinkNames(url) {
    const articleHtml = await fetchArtcleText(url);

    const $ = cheerio.load(articleHtml);

    let urls = [];

    $('a,link').each((i, elem) => {
        elem = $(elem);

        urls.push(elem.attr('href'));
    });

    urls = urls.filter((url) => {
        return url.startsWith('/wiki');
    });

    const articleNames = urls.map((url) => {
        return url.slice(6);
    });

    return articleNames;
}

async function main() {
    const targetPageName = 'World_War_II';
    const linkedArticleNames = await fetchArticleLinkNames(makeApiLink('Zvi_Bern'));

    console.log(linkedArticleNames);
}

main();

