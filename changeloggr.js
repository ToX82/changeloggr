// Funzione per rimuovere changelogHash dal localStorage
function removeChangelogHash() {
    localStorage.removeItem('changelogHash');
}

// Funzione setup() con le modifiche
function setup() {
    var scriptPath = getScriptPath();
    var path = scriptPath.replace(/[^/]*$/, '');
    var file = getURLParameter(scriptPath, 'file');

    if (!file) {
        console.log('No changelog parameter specified');
        return Promise.reject(new Error('No changelog parameter specified'));
    }

    // Load the marked library and CSS file
    var markedPromise = loadMarkedLibrary();
    var theme = getThemeFromURL(scriptPath);
    var stylesheet = createStylesheetLink(path, theme);
    document.head.appendChild(stylesheet);

    // Fetch template.html and the changelog file
    return Promise.all([
        markedPromise,
        fetch(path + 'template.html'),
        fetch(file)
    ]).then(function (responses) {
        var markedLoaded = responses[0];
        var templateResponse = responses[1];
        var changelogResponse = responses[2];

        return Promise.all([
            markedLoaded,
            templateResponse.text(),
            changelogResponse.text()
        ]);
    }).then(function (results) {
        var markedLoaded = results[0];
        var templateHtml = results[1];
        var changelogContent = results[2];
        var element = document.createElement('div');
        element.innerHTML = templateHtml;
        document.body.appendChild(element);

        // Parse the changelog file using marked
        var changelogContentHtml = marked.parse(changelogContent);

        // Check if the changelog content has changed
        var changelogHash = hashString(changelogContent);
        var storedHash = localStorage.getItem('changelogHash');
        var hasUpdated = changelogHash !== storedHash;

        if (hasUpdated) {
            // Update the stored hash and show the changelog modal
            localStorage.setItem('changelogHash', changelogHash);

            var contentElement = document.querySelector(".content");
            contentElement.innerHTML = changelogContentHtml;
        }

        return hasUpdated;
    }).catch(function (error) {
        console.error("Error loading resources:", error);
        return false;
    });
}

// Rest of the code remains the same...

// Funzione per ottenere il percorso dello script corrente
function getScriptPath() {
    var scripts = document.getElementsByTagName('script');

    for (var i = 0; i < scripts.length; i += 1) {
        if (scripts[i].hasAttribute('src')) {
            var path = scripts[i].src;
            if (path.indexOf('changeloggr') > -1) {
                return path;
            }
        }
    }
}

// Funzione per ottenere il valore di un parametro URL
function getURLParameter(scriptPath, name) {
    var set = scriptPath.split(name + '=');
    if (set[1]) {
        return set[1].split(/[&?]+/)[0];
    } else {
        return false;
    }
}

// Funzione per creare un hash di una stringa (contenuto del changelog in questo caso)
function hashString(input) {
    var hash = 0;
    if (input.length === 0) return hash;
    for (var i = 0; i < input.length; i++) {
        var char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
}

// Funzione per caricare la libreria marked
function loadMarkedLibrary() {
    return new Promise(function (resolve, reject) {
        var markedScript = document.createElement('script');
        markedScript.onload = resolve;
        markedScript.onerror = reject;
        markedScript.src = 'https://cdn.jsdelivr.net/npm/marked@4/lib/marked.umd.min.js';
        document.head.appendChild(markedScript);
    });
}

// Funzione per ottenere il tema dall'URL o utilizzare il tema predefinito
function getThemeFromURL(scriptPath) {
    var theme = 'default';
    if (getURLParameter(scriptPath, 'theme')) {
        theme = getURLParameter(scriptPath, 'theme');
    }
    return theme;
}

// Funzione per creare un elemento link stylesheet per il tema specificato
function createStylesheetLink(path, theme) {
    var minified = (path.indexOf('.min') > -1) ? '.min' : '';
    var stylesheet = document.createElement('link');
    stylesheet.setAttribute('rel', 'stylesheet');
    stylesheet.setAttribute('href', path + 'themes/' + theme + minified + '.css');
    return stylesheet;
}

// Invoca la funzione setup() quando il DOM è completamente caricato
document.addEventListener('DOMContentLoaded', function () {
    if (document.cookie || Object.keys(localStorage).length > 0) {
        setup()
            .then(function (updated) {
                if (updated) {
                    var modal = document.getElementById("changeloggr");
                    var closeModal = modal.querySelector(".close-button");

                    modal.showModal();
                    closeModal.addEventListener("click", function () {
                        modal.close();
                    });
                }
            })
            .catch(function (error) {
                console.error("Error loading resources:", error);
            });
    }
});