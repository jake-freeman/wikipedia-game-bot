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
        return url.startsWith('/wiki/')
            && !url.startsWith('/wiki/File')
            && !url.startsWith('/wiki/User:')
            && !url.startsWith('/wiki/Special:')
            && !url.startsWith('/wiki/Help:');
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

async function searchForTarget(startName, targetName, depthLimit = Infinity) {
    let queue = [
        [startName]
    ];

    if (startName === targetName) {
        return [startName, targetName];
    }

    const explored = new Set();
    explored.add(startName);

    while (queue.length) {
        const path = queue.shift();
        const node = path[path.length - 1];

        const depth = path.length;

        if (depth > depthLimit) {
            return null;
        }

        let edges = await fetchArticleLinkNames(makeApiLink(node));

        edges = edges.map(edge => edge.trim());

        edges = edges.filter((edge, index, self) => { 
            return self.indexOf(edge) === index;
        });

        const globallyUnique = edges.filter((edge) => !explored.has(edge));

        for (const edge of globallyUnique) {
            if (edge === targetName) {
                return path.concat([targetName]);
            }

            queue.push([
                ...path,
                edge
            ]);

            explored.add(edge);
        }

        console.log(`checked: ${explored.size}, depth: ${depth}, requests: ${requests}, checking: ${node}`);
    }
}

async function main() {
    const [ startingPageName, targetPageName ] = ['Elon_Musk', 'Chartreuse_(color)'];
    
    const depthLimit = 4;

    const path = await searchForTarget(startingPageName, targetPageName, depthLimit);

    if (path) {
        printPath(path);
    }
    else {
        console.error(`Failed to find a path with at a depth of ${depthLimit}`);
    }
}

main();

