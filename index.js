const fetch = require('node-fetch');
const cheerio = require('cheerio');

function makeApiLink(pageName) {
    return `https://en.wikipedia.org/api/rest_v1/page/mobile-sections/${pageName}`;
}

let requests = 0;

async function fetchArtcleText(url) {
    let res;
    let json;

    requests++;

    try {
        res = await fetch(url);
        json = await res.json();
    }
    catch(e) {
        return '';
    }
    
    let sections = (json.lead && json.lead.sections) || [];

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
        return url.startsWith('/wiki/') && !url.startsWith('/wiki/File');
    });

    const articleNames = urls.map((url) => {
        return url.slice(6);
    });

    return articleNames;
}

function printPath(path) {
    console.log('Found path:');
    console.log(path.join(' -> '));
    console.log(`In only ${requests} requests`);
}

async function searchForTarget(startName, targetName) {
    let queue = [
        [startName]
    ];

    let found = (startName === targetName);

    const explored = new Set();
    explored.add(startName);

    while (queue.length) {
        const path = queue.shift();
        const node = path[path.length - 1];

        const edges = await fetchArticleLinkNames(makeApiLink(node));

        const uniqueEdges = edges.filter((edge) => !explored.has(edge));

        for (const edge of uniqueEdges) {
            if (edge === targetName) {
                found = true;

                return path.concat([targetName]);
            }

            queue.push([
                ...path,
                edge
            ]);

            explored.add(edge);
        }
    }
}

async function main() {
    const startingPageName = 'Zvi_Bern';
    const targetPageName = 'World_War_II';

    const path = await searchForTarget(startingPageName, targetPageName);

    if (path) {
        printPath(path);
    }
    else {
        console.error('Failed to find a path');
    }
}

main();

