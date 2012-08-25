/* Comic viewer javascript code (comiclib)
 * Author: David Powell (BitLooter)
 * 
 * Compatibility notes:
 * 	Tested to work on modern versions of all major browsers (FF 4+, IE 8+,
 *  Opera 10+, Safari, and Chrome have all been tested).
 * 
 * 	All efforts have been made to write this standards-complient with the
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
 *  The viewer itself only uses localStorage, but no such guarentee can be
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
 *  2011-01-10 v1.7	   Added keyboard accelerators
 *  2011-01-02 v1.6.3  Added 'listtype' field to info.txt
 *  2010-12-14 v1.6.2  Comics without images (blog only) are now displayed correctly
 *  2010-12-09 v1.6.1  Page scrolls to top on comic strip load
 *  2010-10-18 v1.6    Added framework for postprocessing to add bonus content
 *                     localStorage support added. Disabled because of issues.
 *                     Date displayed in title bar
 *  2010-10-16 v1.5    Added ability to toggle display of storyline and extras
 *  2010-10-13 v1.4.1: Fixed out-of-bounds error when loading strip ID in URL
 *  2010-10-12 v1.4:   Added footer
 *                     Strip ID in URL
 *  2010-10-09 v1.3.1: Hides strip area when only blog text is present
 *  2010-10-01 v1.3:   Added support for custom postprocessing scripts
 *  2010-09-26 v1.2:   Added support for multiple image comics
 *                     Corrected HTML formatting issues on blog text
 *  2010-09-21 v1.1.1: Caches first and last images
 *  2010-09-16 v1.1:   Caches random pick
 *  2010-09-14 v1.0.1: Simplified code, refactored some CSS classes/ids
 *  2010-09-09 v1.0:   Next and previous images cached for faster viewing
 *                     Declared it worthy of v1.0
 *  2010-09-08 v0.9b2: Added date/episode prefixes to selector
 *                     Moved init code to this file
 * 	2010-09-05 v0.9b1: Initial basic feature-complete version
 */

function clearNodeContents(element)
{
    while(element.firstChild != null)
        element.removeChild(element.firstChild);
}

//Saves a piece of data to the local system
function saveData(name, value)
{
	// Firefox has a bug that throws an error checking for localStorage if
	// cookies are disabled. This bug is still present as of v7.0.1.
	
	try {
		if (typeof(localStorage) != "undefined")
		{
			localStorage.setItem(name, value);
		}
	} catch(e) {
		return null;
	}
}

// Gets a piece of data to the local system
function getData(name)
{
	// See saveData - localStorage has issues on Firefox
	
	try {
		if (typeof(localStorage) != "undefined")
		{
			return localStorage.getItem(name);
		}
	} catch(e) {
		return null;
	}
}

//Sets the onclick property of all elements with a given class name
function setOnclicks(className, func)
{
    elements = document.getElementsByClassName(className);
    for (i = 0; i < elements.length; i++)
    {
    	elements[i].onclick = func;
    }
}

//Sets the onchange property of all elements with a given class name
function setOnchanges(className, func)
{
    elements = document.getElementsByClassName(className);
    for (i = 0; i < elements.length; i++)
    {
    	elements[i].onchange = func;
    }
}

// Hides all elements with a given class name
function hideByClassName(className)
{
    elements = document.getElementsByClassName(className);
    for (i = 0; i < elements.length; i++)
    {
    	elements[i].style.visibility = "hidden";
    }
}

// Shows all elements witha a given class name
function showByClassName(className)
{
    elements = document.getElementsByClassName(className);
    for (i = 0; i < elements.length; i++)
    {
    	elements[i].style.visibility = "visible";
    }
}

// Hides comic strip for when there is only blog content
function hideStrip()
{
	hideById("title2nav");
	hideById("navigation-top");
	hideById("nav2comic");
	hideById("stripContainer");
	hideById("comic2nav-bottom");
}

function showStrip()
{
	showById("title2nav");
	showById("navigation-top");
	showById("nav2comic");
	showById("stripContainer");
	showById("comic2nav-bottom");
}

function hideById(id)
{
	document.getElementById(id).style.display = "none";
}

function showById(id)
{
	document.getElementById(id).style.display = "block";
}

// Preloads an image so it's in the browser's cache, ready for instant viewing
function cacheImage(url)
{
	imageCache = document.createElement("img");
	imageCache.src = url;
}

// Caches multiple image filenames joined by "||" characters
function cacheJoinedImages(prefix, filenames)
{
	splitFiles = filenames.split("||");
	if (splitFiles != "")
	{
		for (i = 0; i < splitFiles.length; i++)
		{
			cacheImage(prefix+splitFiles[i]);
		}
	}
}

// Precaches next and previous comics for fast loading
function preloadComics()
{
	prevComic = closestAllowedComic(-1);
	if (prevComic != -1)
	{
    	cacheJoinedImages("comics/", comicDB[prevComic]["filename"]);
    }
	nextComic = closestAllowedComic(1);
    if (nextComic != -1)
    {
    	cacheJoinedImages("comics/", comicDB[nextComic]["filename"]);
    }
    cacheJoinedImages("comics/", comicDB[firstAllowedComic()]["filename"]);
    cacheJoinedImages("comics/", comicDB[lastAllowedComic()]["filename"]);
}

function storyCheckChanged()
{
	extrasCheck = document.getElementById("extrasCheck");
	if (!this.checked && extrasCheck.checked == false)
	{
		extrasCheck.checked = true;
	}
	preloadComics();
    selectNextRandomComic();
    saveOptions();
}

function extrasCheckChanged()
{
	storyCheck = document.getElementById("storyCheck");
	if (!this.checked && storyCheck.checked == false)
	{
		storyCheck.checked = true;
	}
	preloadComics();
    selectNextRandomComic();
    saveOptions();
}

function hashChanged()
{
    comicNumber = parseInt(location.hash.substring(1));
    if (comicNumber != NaN)
    {
        setComic(comicNumber);
    }
}

function saveOptions()
{
    // Save storyline status
    saveData(comicName+"-usestory", useStory());
    // Save extras status
    saveData(comicName+"-useextras", useExtras());
}

function closestAllowedComic(direction)
{
	// Normalize direction
	direction = direction / Math.abs(direction);
	
	for (comic = currentComic + direction;
			comic >= 0 && comic < comicDB.length;
			comic += direction)
	{
		if (comicAllowed(comic))
		{
			return comic;
		}
	}
	
	// If the function made it this far, no valid comics found
	return -1;
}

// Returns ID of first valid comic with current settings
function firstAllowedComic()
{
	for (i = 0; i < comicDB.length; i++)
	{
		if (comicAllowed(i))
		{
			return i;
		}
	}
}

// Returns ID of last valid comic with current settings
function lastAllowedComic()
{
	for (i = comicDB.length - 1; i >= 0; i--)
	{
		if (comicAllowed(i))
		{
			return i;
		}
	}
}

// Returns true or false depending on current selected options
function comicAllowed(comicID)
{
	if (comicDB[comicID]["isstoryline"] && useStory() ||
			!comicDB[comicID]["isstoryline"] && useExtras())
	{
		return true;
	} else
	{
		return false;
	}
}

// Returns True if the story checkbox is marked
function useStory()
{
	return document.getElementById("storyCheck").checked
}

//Returns True if the extras checkbox is marked
function useExtras()
{
	return document.getElementById("extrasCheck").checked
}

// Increments comic forwards or backwards - positive is next, negative is prev
function incComic(direction)
{
	nextComic = closestAllowedComic(direction);
	if (nextComic != -1)
	{
		setComic(nextComic);
	}
	
	return nextComic;
}

function goFirst()
{
	setComic(firstAllowedComic());
}

function goPrev()
{
	return incComic(-1);
}

function goNext()
{
	return incComic(1);
}

function goLast()
{
	setComic(lastAllowedComic());
}

function goRandom()
{
	setComic(nextRandom);
	selectNextRandomComic();
}

function selectNextRandomComic()
{
    while (true)
    {
    	nextRandom = Math.floor(Math.random()*(comicDB.length));
    	if (comicAllowed(nextRandom))
    	{
    		cacheJoinedImages("comics/", comicDB[nextRandom]["filename"]);
    		break;
    	}
    }
}

function comicSelected()
{
	setComic(this.selectedIndex);
}

function keyPressedEvent(e)
{
	if (e.which == 189 || e.which == 111) // First comic: - or numpad/ 
	{
		goFirst();
	} else if (e.which == 219 || e.which == 109) // Previous comic: [ or numpad-
	{
		goPrev();
	} else if (e.which == 221 || e.which == 107) // Next comic: ] or numpad+
	{
		goNext();
	} else if (e.which == 187 || e.which == 106) // Last comic: = or numpad*
	{
		goLast();
	} else if (e.which == 220 || e.which == 45) // Random comic: \ or Num 0
	{
		goRandom();
	} else if (e.which == 72 || e.which == 191) // Show help page
	{
		toggleHelpPanel();
	}
}

function toggleHelpPanel()
{
	helpElement = document.getElementById("helpScreen")
	if (helpElement.style.display == "none")
	{
		helpElement.style.display = "block";
	} else if (helpElement.style.display == "block")
	{
		helpElement.style.display = "none";
	}
}

// Replaces variables in string with data
function replaceVariables(inputString, comic)
{
	outputString = inputString;
	outputString = outputString.replace("%episode%", comic["episode"]);
	outputString = outputString.replace("%date%", comic["date"]);
	outputString = outputString.replace("%title%", comic["title"]);
	return outputString;
}

function setComic(comicNum)
{
    currentComic = comicNum;
    var comic = comicDB[currentComic];
    
    // Set the window title
    prefix = replaceVariables(titleFormat, comic);
    window.document.title = prefix + " - Comic viewer";
    // Set hash in URL
    window.location.hash = currentComic;
    
    // Set the selector
    selectBoxes = document.getElementsByClassName("selector");
    for (i = 0; i < selectBoxes.length; i++)
    {
    	selectBoxes[i].selectedIndex = comicNum;
    }
    
    // Set the title
    titleElement = document.getElementById("title");
    titleElement.innerHTML = comic["title"];
    
    // Set the comic
    stripContainer = document.getElementById("stripContainer");
    clearNodeContents(stripContainer);
    files = comic["filename"].split("||");
    for (i = 0; i < files.length; i++)
    {
	    filename = "comics/"+files[i];
	    // special processing for Flash files
	    if (filename.indexOf(".swf") != -1)
	    {
	    	fileInfo = filename.split("?");
	    	dim = fileInfo[1].split(",");
	    	
	    	imageElement = document.createElement("embed");
	    	imageElement.src = fileInfo[0];
	    	imageElement.width = dim[0];
	    	imageElement.height = dim[1];
	    } else
	    {
	        imageElement = document.createElement("img");
	        imageElement.src = filename;
	        imageElement.title = comic["hovertext"].split("||")[i];
	        imageElement.alt = "Error loading comic: "+filename;
	    }
	    
	    if (comic["alternate"] != "")
	    {
	    	linkElement = document.createElement("a");
	    	altFile = comic["alternate"].split("||")[i];
	    	linkElement.href = altFile;
	    	linkElement.appendChild(imageElement);
	    	element = linkElement;
	    } else
	    {
	    	element = imageElement;
	    }
	    
	    stripContainer.appendChild(element);
    }
    
    // Preload the next and previous images for faster viewing
    preloadComics();
    
    // Set the blog text
    blogContainer = document.getElementById("blogContainer");
    blogText = comicDB[currentComic]["blogtext"];
    if (blogText != "")
    {
    	blogElement = document.getElementById("blog");
        clearNodeContents(blogElement);
        blogElement.innerHTML = blogText;
        blogContainer.style.display = "block";
    } else
    {
    	blogContainer.style.display = "none";
    }
    
    // Set the footer info
    url = comicDB[currentComic]["url"];
    linkElement = document.getElementById("stripUrl");
    clearNodeContents(linkElement);
    linkElement.appendChild(document.createTextNode(url));
    linkElement.href = url;
    
    // Disable buttons, if needed
    if (currentComic == 0)
    {
    	hideByClassName("navFirst");
    	hideByClassName("navPrev");
    	showByClassName("navNext");
    	showByClassName("navLast");
    } else if (currentComic == comicDB.length-1)
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
    	hideStrip();
    } else
    {
    	showStrip();
    }
    
    // Do any needed comic postprocessing
    if (typeof(postprocessComic) != "undefined")
    {
    	postprocessComic();
    }
    
    // Scroll the page to the beginning
    window.scroll(0, 0);
}

function initViewer()
{
    // Populate the comic selector
    selectBoxes = document.getElementsByClassName("selector");
    for (i = 0; i < comicDB.length; i++)
    {
    	optionText = replaceVariables(listFormat, comicDB[i]);
        option = document.createElement("option");
    	option.innerHTML = optionText;
        for (selectNum = 0; selectNum < selectBoxes.length; selectNum++)
        {
        	selectBoxes[selectNum].appendChild(option.cloneNode(true));
        }
    }
        
    // Set up the navagation links
    setOnclicks("navFirst", goFirst);
    setOnclicks("navPrev", goPrev);
    setOnclicks("navNext", goNext);
    setOnclicks("navLast", goLast);
    setOnclicks("navRand", goRandom);
    setOnclicks("helpToggleLink", toggleHelpPanel);
    setOnchanges("selector", comicSelected);
    document.getElementById("storyCheck").onchange = storyCheckChanged;
    document.getElementById("extrasCheck").onchange = extrasCheckChanged;
    
    // Set comic to URL hash
    if (window.location.hash != "")
    {
    	id = parseInt(window.location.hash.substring(1))
    	if (id >= 0 && id < comicDB.length)
    	{
        	setComic(id);
    	} else
    	{
    		setComic(0);
    	}
    } else  // Else set comic to last read
    {
	    lastRead = parseInt(getData(comicName+"-last"));
	    if (isNaN(lastRead))
	    	lastRead = 0;
	    setComic(lastRead);
    }
    
    selectNextRandomComic();
    
    // Restore story/extras settings
    story = getData(comicName+"-usestory");
    if (story != null)
    {
    	document.getElementById("storyCheck").checked = (story == "true");
    }
    extras = getData(comicName+"-useextras");
    if (extras != null)
    {
    	document.getElementById("extrasCheck").checked = (extras == "true");
    }
	
    // Set up keyboard accelerators
	document.onkeyup = keyPressedEvent;
	
	// Perform any postprocessing this viewer requires
	if (typeof(postprocess) != "undefined")
	{
		postprocess();
	}
	
    // Track changes to the URL's hash and update the comic
    window.onhashchange = hashChanged;
    
	// Now that we're all done, remove the loading screen
	document.getElementById("loadingScreen").style.display = "none";
}

// Init code
/////////////

var currentComic = 0;
var nextRandom = 0;
window.onload = initViewer;
