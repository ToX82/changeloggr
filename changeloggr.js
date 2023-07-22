/**
 * Loads the setup process asynchronously, when the DOM is completely loaded
 */
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
 * Executes the setup process.
 *
 * @return {Promise<boolean>} A Promise that resolves to a boolean indicating whether the setup process was successful.
 */
async function setup() {
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
