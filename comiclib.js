/* Comic viewer JavaScript code (comiclib)
 * Author: David Powell (BitLooter)
 * 
 * Compatibility notes:
 *  Tested to work on modern versions of all major browsers (FF 4+, IE 8+,
 *  Opera 10+, Safari, and Chrome have all been tested).
 * 
 *  All efforts have been made to write this standards-complaint with the
 *  current HTML5 draft, though it should also work as HTML4/XHTML. The only
 *  HTML5 tech used to date is localStorage, for saving settings and the last
 *  read strip; this was used because cookies turned out to be problematic
 *  for many browsers when used on pages in the local filesystem. If your
 *  browser does not support localStorage, it will still work, the viewer just
 *  won't save state between sessions. Also, upgrade your friggin' browser,
 *  we're in the 21st century now. Hashchange is also used to properly update
 *  the current strip when using the browser's navigation buttons, but the
 *  viewer will still function without it.
 *  
 *  The viewer itself only uses localStorage, but no such guarantee can be
 *  made of the content. Some scrapers written for this make use of multimedia
 *  features such as <video> tags, for example. As blog information is
 *  typically taken directly from the source site, these HTML segments do not
 *  necessarily follow standards.
 *  
 *  Some minor concessions were made against standards; the viewer makes use
 *  of innerHTML, because trying to write code to insert prefab HTML scraped
 *  from web pages (that may or may not be themselves standards-compliant)
 *  using the DOM would have cost me my sanity. As innerHTML is by this point
 *  a de-facto standard anyways, I don't foresee this being a problem. The
 *  other minor issue is a check in the localStorage code for an error
 *  condition found on Firefox browsers; cookies disabled in the browser will
 *  cause use of the object to throw a cryptic exception. If Mozilla ever fixes
 *  this I'll remove the check, as I have no interest in adding code cruft to
 *  support out-of-date browsers.
 * 
 * Version history:
 *  2012-08-26 v2.0    Refactored this file. All comic-related functions are in viewer.
 *                     Also, no more (unnecessary) global variables.
 *  2011-11-04 v1.9.3  Added hashChanged function to watch the URL hash
 *  2011-06-08 v1.9.2  Changed random keybinding to Num 0
 *                     Moved JS event binding from template to initViewer()
 *  2011-06-07 v1.9.1  Fixed localStorage helper functions to work on Firefox
 *                     Added help screen; bound to 'h' and '/'
 *  2011-03-25 v1.9    Window title and list format are now defined with variable strings
 *  2011-03-24 v1.8.5  Alternate file link no longer prefixed with "comics/"
 *  2011-03-21 v1.8.4  Fixed the last fix - initView checks for NaN, not null
 *  2011-03-15 v1.8.3  Fixed a bug - last read comic was read as string, not int
 *  2011-02-03 v1.8.2  Added nav bar below blog, blog hidden when not present
 *  2011-01-23 v1.8    Added loading screen, large databases have long parse times
 *  2011-01-18 v1.7.1  Recognizes listtype of 'none'
 *  2011-01-10 v1.7    Added keyboard accelerators
 *  2011-01-02 v1.6.3  Added 'listtype' field to info.txt
 *  2010-12-14 v1.6.2  Comics without images (blog only) are now displayed correctly
 *  2010-12-09 v1.6.1  Page scrolls to top on comic strip load
 *  2010-10-18 v1.6    Added framework for postprocessing to add bonus content
 *                     localStorage support added. Disabled because of issues.
 *                     Date displayed in title bar
 *  2010-10-16 v1.5    Added ability to toggle display of storyline and extras
 *  2010-10-13 v1.4.1  Fixed out-of-bounds error when loading strip ID in URL
 *  2010-10-12 v1.4    Added footer
 *                     Strip ID in URL
 *  2010-10-09 v1.3.1  Hides strip area when only blog text is present
 *  2010-10-01 v1.3    Added support for custom postprocessing scripts
 *  2010-09-26 v1.2    Added support for multiple image comics
 *                     Corrected HTML formatting issues on blog text
 *  2010-09-21 v1.1.1  Caches first and last images
 *  2010-09-16 v1.1    Caches random pick
 *  2010-09-14 v1.0.1  Simplified code, refactored some CSS classes/ids
 *  2010-09-09 v1.0    Next and previous images cached for faster viewing
 *                     Declared it worthy of v1.0
 *  2010-09-08 v0.9b2  Added date/episode prefixes to selector
 *                     Moved init code to this file
 *  2010-09-05 v0.9b1  Initial basic feature-complete version
 * 
 * TODO: close help window if you click outside the help pane
 * TODO: blur selection box after selection is made
 */


/* Constants *
 *************/
PREVIOUS_COMIC = -1;
NEXT_COMIC     = 1;
INVALID_COMIC  = -1;


/* Utility functions *
 *********************/

// Removes all child nodes from a DOM element
function clearNodeContents(element)
{
    while(element.firstChild != null)
        element.removeChild(element.firstChild);
}

//Saves a piece of data to localStorage
function saveData(name, value)
{
    // If localStorage is disabled or not available, just don't save any data
    try {
        localStorage.setItem(name, value);
    } catch(e) {
        return null;
    }
}

// Gets a piece of data from localStorage
function getData(name)
{
    // If localStorage isn't available just don't load any settings
    try {
        return localStorage.getItem(name);
    } catch(e) {
        return null;
    }
}

// Adds an event listener to all elements with a given class name
function setClassEvents(className, eventType, func)
{
    var elements = document.getElementsByClassName(className);
    for (var i = 0; i < elements.length; i++)
    {
        elements[i].addEventListener(eventType, func, false);
    }
}

// Hides all elements with a given class name
function hideByClassName(className)
{
    var elements = document.getElementsByClassName(className);
    for (var i = 0; i < elements.length; i++)
    {
        elements[i].style.visibility = "hidden";
    }
}

// Shows all elements with a given class name
function showByClassName(className)
{
    var elements = document.getElementsByClassName(className);
    for (var i = 0; i < elements.length; i++)
    {
        elements[i].style.visibility = "visible";
    }
}

// Hides an element with a given ID
function hideById(id)
{
    document.getElementById(id).style.display = "none";
}

// Shows a previously hidden element with a given ID
function showById(id)
{
    document.getElementById(id).style.display = "block";
}

// Preloads an image so it's in the browser's cache, ready for instant viewing
function cacheImage(url)
{
    var imageCache = document.createElement("img");
    imageCache.src = url;
}

// Caches multiple image filenames joined by "||" characters
function cacheJoinedImages(prefix, filenames)
{
    var splitFiles = filenames.split("||");
    if (splitFiles != "")
    {
        for (var i = 0; i < splitFiles.length; i++)
        {
            cacheImage(prefix+splitFiles[i]);
        }
    }
}

var viewer = {
    init: function()
    {
        // Populate the comic selector dropboxes
        for (var i = 0; i < comicDB.length; i++)
        {
            var optionText = viewer.replaceVariables(listFormat, comicDB[i]);
            var option = document.createElement("option");
            option.innerHTML = optionText;
            for (var selectNum = 0; selectNum < viewer.selectBoxes.length; selectNum++)
            {
                viewer.selectBoxes[selectNum].appendChild(option.cloneNode(true));
            }
        }
        
        // Set up the navigation links
        setClassEvents("navFirst", "click", viewer.goFirst);
        setClassEvents("navPrev", "click", viewer.goPrev);
        setClassEvents("navNext", "click", viewer.goNext);
        setClassEvents("navLast", "click", viewer.goLast);
        setClassEvents("navRand", "click", viewer.goRandom);
        setClassEvents("helpToggleLink", "click", viewer.toggleHelpPanel);
        setClassEvents("selector", "change", function(e){
            viewer.setComic(this.selectedIndex);
            // Blur the select box, so page navigation controls don't select comics instead
            e.target.blur();
        });
        
        // Watch the options checkboxes
        document.getElementById("storyCheck").addEventListener("change", viewer.storyCheckChanged, false);
        document.getElementById("extrasCheck").addEventListener("change", viewer.extrasCheckChanged, false);
        
        // Set comic to URL hash, if it's defined
        if (window.location.hash != "")
        {
            var initialComic = parseInt(window.location.hash.substring(1))
            // Sanity check: is the hash value a valid comic ID?
            if (initialComic < 0 || initialComic >= comicDB.length)
            {
                initialComic = 0;
            }
        } else  // Else set comic to last read
        {
            var initialComic = parseInt(getData(comicName+"-last"));
            if (isNaN(initialComic))
                initialComic = 0;
        }
        viewer.setComic(initialComic);

        // Prepare first random comic
        viewer.selectNextRandomComic();
        
        // Restore story/extras settings
        var story = getData(comicName+"-usestory");
        if (story != null)
        {
            document.getElementById("storyCheck").checked = (story == "true");
        }
        var extras = getData(comicName+"-useextras");
        if (extras != null)
        {
            document.getElementById("extrasCheck").checked = (extras == "true");
        }

        // Cache first and last comics
        cacheJoinedImages("comics/", comicDB[viewer.firstAllowedComic()]["filename"]);
        cacheJoinedImages("comics/", comicDB[viewer.lastAllowedComic()]["filename"]);
        
        // Set up keyboard accelerators
        window.addEventListener("keyup", viewer.keyPressedEvent, false);

        // Perform viewer postprocessing, if any has been defined
        if (typeof(postprocess) != "undefined")
        {
            postprocess();
        }

        // Track changes to the URL's hash and update the comic
        window.addEventListener("hashchange", viewer.hashChanged, false);
        
        // Now that we're all done, remove the loading screen
        document.getElementById("loadingScreen").style.display = "none";
    },
    
    // Sets the current comic and all metadata to comicNum's comic
    setComic: function(comicNum)
    {
        viewer.currentComic = comicNum;
        var comic = comicDB[comicNum];
        
        // Set the window title
        var prefix = viewer.replaceVariables(titleFormat, comic);
        window.document.title = prefix + " - Comic viewer";
        
        // Set hash in URL
        window.location.hash = comicNum;
        
        // Set the selector
        for (var i = 0; i < viewer.selectBoxes.length; i++)
        {
            viewer.selectBoxes[i].selectedIndex = comicNum;
        }
        
        // Set the title
        viewer.titleElement.innerHTML = comic["title"];
        
        // Set the comic
        clearNodeContents(viewer.stripContainer);
        var files = comic["filename"].split("||");
        // Loop over all images and add them to the strip container
        for (var i = 0; i < files.length; i++)
        {
            // Fill the strip area with the images
            var filename = "comics/"+files[i];
            // special processing for Flash files
            if (filename.indexOf(".swf") != -1)
            {
                var fileInfo = filename.split("?");
                var dim = fileInfo[1].split(",");
                
                var imageElement = document.createElement("embed");
                imageElement.src = fileInfo[0];
                imageElement.width = dim[0];
                imageElement.height = dim[1];
            } else
            {
                var imageElement = document.createElement("img");
                imageElement.src = filename;
                imageElement.title = comic["hovertext"].split("||")[i];
                imageElement.alt = "Error loading comic: "+filename;
            }
            
            // If the comic has an alternate link, wrap the image in link anchor
            if (comic["alternate"] != "")
            {
                var linkElement = document.createElement("a");
                var altFile = comic["alternate"].split("||")[i];
                linkElement.href = altFile;
                linkElement.appendChild(imageElement);
                var element = linkElement;
            } else  // else no alternate link, image element is the one to use
            {
                element = imageElement;
            }
            
            // Add the element to the container
            viewer.stripContainer.appendChild(element);
        }
        
        // Preload the next and previous images for faster viewing
        viewer.preloadComics();
        
        // Set the blog text
        var blogText = comicDB[comicNum]["blogtext"];
        if (blogText != "")
        {
            var blogElement = document.getElementById("blog");
            clearNodeContents(blogElement);
            blogElement.innerHTML = blogText;
            viewer.blogContainer.style.display = "block";
        } else
        {
            viewer.blogContainer.style.display = "none";
        }
        
        // Set the footer info
        var url = comicDB[comicNum]["url"];
        clearNodeContents(viewer.linkElement);
        viewer.linkElement.appendChild(document.createTextNode(url));
        viewer.linkElement.href = url;
        
        // Disable buttons, if needed
        if (comicNum == 0)
        {
            hideByClassName("navFirst");
            hideByClassName("navPrev");
            showByClassName("navNext");
            showByClassName("navLast");
        } else if (comicNum == comicDB.length-1)
        {
            showByClassName("navFirst");
            showByClassName("navPrev");
            hideByClassName("navNext");
            hideByClassName("navLast");
        } else
        {
            showByClassName("navFirst");
            showByClassName("navPrev");
            showByClassName("navNext");
            showByClassName("navLast");
        }
        
        // Set the last-read cookie
        saveData(comicName+"-last", comicNum)
        
        // If no image, hide strip area
        if (comic["filename"] == "" || comic["filename"] == undefined)
        {
            viewer.hideStrip();
        } else
        {
            viewer.showStrip();
        }
        
        // Do any needed comic postprocessing
        if (typeof(postprocessComic) != "undefined")
        {
            postprocessComic();
        }
        
        // Scroll the page to the top
        window.scroll(0, 0);
    },
    
    // Increments comic forwards or backwards - positive is next, negative is prev
    incComic: function(direction)
    {
        var nextComic = viewer.closestAllowedComic(direction);
        if (nextComic != INVALID_COMIC)
        {
            viewer.setComic(nextComic);
        }
        
        return nextComic;
    },
    
    // Jumps to the first valid comic
    goFirst: function()
    {
        viewer.setComic(viewer.firstAllowedComic());
    },
    
    // Jumps to the previous valid comic
    goPrev: function()
    {
        viewer.incComic(PREVIOUS_COMIC);
    },
    
    // Jumps to the next valid comic
    goNext: function()
    {
        viewer.incComic(NEXT_COMIC);
    },
    
    // Jumps to the last valid comic
    goLast: function()
    {
        viewer.setComic(viewer.lastAllowedComic());
    },
    
    // Jumps a random (valid) comic
    goRandom: function()
    {
        viewer.setComic(viewer.nextRandom);
        viewer.selectNextRandomComic();
    },
    
    selectNextRandomComic: function()
    {
        // Try random comics until we hit one that matches the current settings
        while (true)
        {
            viewer.nextRandom = Math.floor(Math.random()*(comicDB.length));
            if (viewer.comicAllowed(viewer.nextRandom))
            {
                cacheJoinedImages("comics/", comicDB[viewer.nextRandom]["filename"]);
                break;
            }
        }
    },
    
    // Returns true or false depending on whether comicID is valid with current selected options
    comicAllowed: function(comicID)
    {
        if (comicDB[comicID]["isstoryline"] && viewer.useStory() ||
            !comicDB[comicID]["isstoryline"] && viewer.useExtras())
        {
            return true;
        } else
        {
            return false;
        }
    },
    
    // Finds the closest valid comic ID to the current one based on view settings
    closestAllowedComic: function(direction)
    {
        // Normalize direction - positive is next comic, negative is previous
        var direction = direction / Math.abs(direction);
        
        // Check every comic until we find a valid one, but stop if we go out of bounds
        for (var comic = viewer.currentComic + direction;
             comic >= 0 && comic < comicDB.length;
             comic += direction)
        {
            if (viewer.comicAllowed(comic))
            {
                return comic;
            }
        }
        
        // If the function made it this far, no valid comics found
        return -1;
    },
    
    // Returns ID of first comic valid with current settings
    firstAllowedComic: function()
    {
        for (var i = 0; i < comicDB.length; i++)
        {
            if (viewer.comicAllowed(i))
            {
                return i;
            }
        }
    },
    
    // Returns ID of last comic valid with current settings
    lastAllowedComic: function()
    {
        for (var i = comicDB.length - 1; i >= 0; i--)
        {
            if (viewer.comicAllowed(i))
            {
                return i;
            }
        }
    },
    
    // Hides comic strip for when there is only blog content
    hideStrip: function()
    {
        hideById("title2nav");
        hideById("navigation-top");
        hideById("nav2comic");
        hideById("stripContainer");
        hideById("comic2nav-bottom");
    },
    
    // Shows comic strip (after hiding for blog-only entry)
    showStrip: function()
    {
        showById("title2nav");
        showById("navigation-top");
        showById("nav2comic");
        showById("stripContainer");
        showById("comic2nav-bottom");
    },
    
    // Precaches next and previous comics for fast loading
    preloadComics: function()
    {
        var prevComic = viewer.closestAllowedComic(-1);
        if (prevComic != INVALID_COMIC)
        {
            cacheJoinedImages("comics/", comicDB[prevComic]["filename"]);
        }
        var nextComic = viewer.closestAllowedComic(1);
        if (nextComic != INVALID_COMIC)
        {
            cacheJoinedImages("comics/", comicDB[nextComic]["filename"]);
        }
    },
    
    // Replaces certain variables in string with comic data
    replaceVariables: function(inputString, comic)
    {
        var outputString = inputString;
        outputString = outputString.replace("%episode%", comic["episode"]);
        outputString = outputString.replace("%date%", comic["date"]);
        outputString = outputString.replace("%title%", comic["title"]);
        return outputString;
    },
    
    // Show or hide the help panel
    toggleHelpPanel: function(e)
    {
        var helpElement = document.getElementById("helpScreen");
        if (helpElement.style.display == "none")
        {
            helpElement.style.display = "block";
        } else if (helpElement.style.display == "block")
        {
            helpElement.style.display = "none";
        }
        if ( typeof(e) != 'undefined' )
        {
            e.stopPropagation();
        }
    },
    
    // Returns True if the story checkbox is marked
    useStory: function()
    {
        return document.getElementById("storyCheck").checked
    },
    
    // Returns True if the extras checkbox is marked
    useExtras: function()
    {
        return document.getElementById("extrasCheck").checked
    },
    
    // Save current settings
    saveOptions: function()
    {
        // Save storyline status
        saveData(comicName+"-usestory", viewer.useStory());
        // Save extras status
        saveData(comicName+"-useextras", viewer.useExtras());
    },
    
    storyCheckChanged: function()
    {
        // At least one of the two checkboxes must be checked
        var extrasCheck = document.getElementById("extrasCheck");
        if (!this.checked && extrasCheck.checked == false)
        {
            extrasCheck.checked = true;
        }
        // Prepare comics for new settings
        viewer.preloadComics();
        viewer.selectNextRandomComic();
        // Save the new settings to local storage
        viewer.saveOptions();
    },
    
    extrasCheckChanged: function()
    {
        // At least one of the two checkboxes must be checked
        var storyCheck = document.getElementById("storyCheck");
        if (!this.checked && storyCheck.checked == false)
        {
            storyCheck.checked = true;
        }
        // Prepare comics for new settings
        viewer.preloadComics();
        viewer.selectNextRandomComic();
        // Save the new settings to local storage
        viewer.saveOptions();
    },
    
    hashChanged: function()
    {
        var comicNumber = parseInt(location.hash.substring(1));
        // Sanity check: is the hash actually a number?
        if (comicNumber != NaN)
        {
            viewer.setComic(comicNumber);
        }
    },
    
    keyPressedEvent: function(e)
    {
        if (e.which == 189 || e.which == 111) // First comic: - or numpad/ 
        {
            viewer.goFirst();
        } else if (e.which == 219 || e.which == 109) // Previous comic: [ or numpad-
        {
            viewer.goPrev();
        } else if (e.which == 221 || e.which == 107) // Next comic: ] or numpad+
        {
            viewer.goNext();
        } else if (e.which == 187 || e.which == 106) // Last comic: = or numpad*
        {
            viewer.goLast();
        } else if (e.which == 220 || e.which == 45 || e.which == 96) // Random comic: \ or Num 0
        {
            viewer.goRandom();
        } else if (e.which == 72 || e.which == 191) // Show help page
        {
            viewer.toggleHelpPanel();
        }
    },
    
    currentComic: 0,
    nextRandom: 0,
    selectBoxes: document.getElementsByClassName("selector"),
    titleElement: document.getElementById("title"),
    stripContainer: document.getElementById("stripContainer"),
    blogContainer: document.getElementById("blogContainer"),
    linkElement: document.getElementById("stripUrl")
}

window.addEventListener("load", viewer.init, false);
