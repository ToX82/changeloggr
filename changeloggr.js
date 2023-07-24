/**
 * Loads the setup process asynchronously, when the DOM is completely loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
    const scriptPath = getScriptPath();
    const fileUrl = getURLParameter(scriptPath, 'file');

    if (!fileUrl) {
        throw new Error('No changelog parameter specified');
    }

    try {
        const size = await getFileSize(fileUrl);
        const changelogHash = localStorage.getItem('changelogHash');

        if (!changelogHash || changelogHash != size.toString()) {
            localStorage.setItem('changelogHash', size.toString());
            const hasLoaded = await setup();

            if (hasLoaded) {
                const modal = document.getElementById('changeloggr');
                const closeModal = modal.querySelector('.close-button');

                modal.showModal();
                closeModal.addEventListener('click', () => {
                    modal.close();
                });
            }
        }
    } catch (error) {
        console.error('Error loading resources:', error);
    }
});

/**
 * Sets up the environment for the application.
 *
 * @return {boolean} Returns a boolean indicating whether the changelog has been updated.
 */
async function setup() {
    const scriptPath = getScriptPath();
    const path = scriptPath.replace(/[^/]*$/, '');
    const file = getURLParameter(scriptPath, 'file');

    try {
        await loadMarkedLibrary();
        const theme = getThemeFromURL(scriptPath);
        const stylesheet = createStylesheetLink(path, theme);
        document.head.appendChild(stylesheet);

        const [markedLoaded, templateResponse, changelogResponse] = await Promise.all([
            loadMarkedLibrary(),
            fetch(path + 'template.html').then(response => response.text()),
            fetch(file).then(response => response.text())
        ]);

        const element = document.createElement('div');
        element.innerHTML = templateResponse;
        document.body.appendChild(element);

        const changelogContentHtml = marked.parse(changelogResponse);
        const contentElement = document.querySelector('.changeloggr-content');
        contentElement.innerHTML = changelogContentHtml;

        return true;
    } catch (error) {
        console.error('Error loading resources:', error);
        return false;
    }
}

/**
 * Removes the 'changelogHash' item from the localStorage.
 *
 * @param {string} paramName - The name of the parameter.
 * @return {undefined} This function does not return a value.
 */
function removeChangelogHash() {
    localStorage.removeItem('changelogHash');
}

/**
 * Retrieves the size of a file from a given URL.
 *
 * @param {string} url - The URL of the file to retrieve the size from.
 * @return {Promise<number>} A promise that resolves to the size of the file as a number.
 */
async function getFileSize(url) {
    return fetch(url, {
        method: 'HEAD' // Utilizza il metodo HEAD per ottenere solo gli header senza il corpo del file
    })
        .then(response => {
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
                return parseInt(contentLength, 10); // Restituisce la dimensione del file come numero intero
            } else {
                throw new Error('Content-Length header not found in the response.');
            }
        })
        .catch(error => {
            console.error('Error fetching file size:', error);
            // Gestire eventuali errori di rete o altre eccezioni
        });
}

/**
 * Retrieves the path of the current script.
 *
 * @return {string} The path of the current script.
 */
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

/**
 * Retrieves the value of a URL parameter.
 *
 * @param {string} scriptPath - The URL path containing the parameter.
 * @param {string} name - The name of the parameter to retrieve.
 * @return {string|boolean} - The value of the parameter if found, or false if not found.
 */
function getURLParameter(scriptPath, name) {
    var set = scriptPath.split(name + '=');
    if (set[1]) {
        return set[1].split(/[&?]+/)[0];
    } else {
        return false;
    }
}

/**
 * Generates a hash value for the given input string.
 *
 * @param {string} input - The string to be hashed.
 * @return {string} The hash value of the input string.
 */
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

/**
 * Loads the Marked library asynchronously.
 *
 * @return {Promise} A promise that resolves when the Marked library is loaded successfully, and rejects if there is an error.
 */
function loadMarkedLibrary() {
    return new Promise(function (resolve, reject) {
        var markedScript = document.createElement('script');
        markedScript.onload = resolve;
        markedScript.onerror = reject;
        markedScript.src = 'https://cdn.jsdelivr.net/npm/marked@4/lib/marked.umd.min.js';
        document.head.appendChild(markedScript);
    });
}

/**
 * Retrieves the theme from the given URL script path - if not specified, the default theme is used.
 *
 * @param {string} scriptPath - The URL script path to retrieve the theme from.
 * @return {string} The retrieved theme from the script path.
 */
function getThemeFromURL(scriptPath) {
    var theme = 'default';
    if (getURLParameter(scriptPath, 'theme')) {
        theme = getURLParameter(scriptPath, 'theme');
    }
    return theme;
}

/**
 * Creates a stylesheet link element with the specified path and theme
 *
 * @param {string} path - The path to the stylesheet.
 * @param {string} theme - The theme for the stylesheet.
 * @return {HTMLLinkElement} The created stylesheet link element.
 */
function createStylesheetLink(path, theme) {
    var minified = (path.indexOf('.min') > -1) ? '.min' : '';
    var stylesheet = document.createElement('link');
    stylesheet.setAttribute('rel', 'stylesheet');
    stylesheet.setAttribute('href', path + 'themes/' + theme + minified + '.css');
    return stylesheet;
}
