#! /usr/bin/python3

import sys
import os
import time
import shutil
from string import Template
import json
import imghdr
import imp
import urllib.request


# Classes #
###########
class ComicDownloaderBase(object):
    urlPrefix = ""
    knownImageExtensions = [".gif", ".png", ".jpg", ".jpeg"]
    knownImageTypes = ["gif", "png", "jpeg"]
    paths = []
    injectedComics = {}
    skipComics = []
    
    def __init__(self, comicRoot, haltUrl=""):
        self.filePrefix = os.path.normpath(comicRoot) + "/"
        self.lastUrl = None
        self.haltUrl = haltUrl
        self.extraComics = []
        
        self.createRequiredPaths()
        
        self.loadComicDB()
    
    def appendDB(self, metadata):
        self.db.append(metadata)
    
    def getArchiveData(self):
        for nextUrl in self.getUrls():
            if nextUrl == self.haltUrl:
                break
            if nextUrl in self.injectedComics:
                for injection in self.injectedComics[nextUrl]:
                    print("Injecting a comic into the stream...")
                    yield injection
            comicData = self.getComicData(nextUrl)
            if nextUrl in self.skipComics:
                continue
            yield comicData
            for extra in self.extraComics:
                yield extra
        raise StopIteration()
    
    def downloadComics(self):
        for metadata, url in self.getArchiveData():
            print("Getting comic {0[date]} - \"{0[title]}\"".format(metadata))
            pathname = self.filePrefix + "comics/{0}".format(metadata["filename"])
            if url != None:
                outfilename = self.getImage(url, pathname)
                if outfilename != metadata["filename"] and outfilename != None:
                    metadata["filename"] = outfilename
            self.appendDB(metadata)
        self.postprocess()
    
    def loadComicDB(self):
        """
        Loads the database of comic strips
        
        Database is in JSON format. Fields should be filename, date, episode,
        title, hovertext, blogtext, alternate, url. alternate is an alternate
        version of the strip, such as a hi-res version. url is the address of
        the original strip page.
        """
        
        dbPathname = self.filePrefix + "/resource/db.json"
        if not os.path.exists(dbPathname):
            # if the database did not already exist, create an empty one 
            self.db = []
        else:
            self.db = json.load(open(dbPathname, "r"))
    
    def writeComicDB(self):
        with open(self.filePrefix + "/resource/db.json", "w") as dbfile:
            dbfile.write(json.dumps(self.db, sort_keys=True, indent=4))
    
    def createRequiredPaths(self):
        """Creates paths required for the viewer"""
        
        if not os.path.exists(self.filePrefix + "/comics"):
            os.mkdir(self.filePrefix + "/comics")
        for path in self.paths:
            if not os.path.exists(self.filePrefix + path):
                os.mkdir(self.filePrefix + path)
    
    def getImage(self, url, filename):
        """Returns (possibly corrected) filename, or None if nothing downloaded"""
        if not os.path.exists(filename):
            # correct filename if needed
            root, ext = os.path.splitext(filename)
            if ext.lower() in self.knownImageExtensions:
                try:
                    self.getFile(url, filename)
                except IOError:
                    raise DownloadError('Unable to download "{0}", aborting download'.format(url))
                except ValueError:
                    # Sometimes ValueError is raised; when this happens, an
                    # empty file is created and should be deleted.
                    os.unlink(filename)
                    raise DownloadError('Unable to download "{0}", aborting download'.format(url))
                
                newname = None
                type = imghdr.what(filename)
                if type not in self.knownImageTypes:
                    raise DownloadError('Image "{0}" is not a known format'.format(url))
                
                # make sure file has correct extension
                if type == "gif" and ext != ".gif":
                    newname = root + ".gif"
                elif type == "png" and ext != ".png":
                    newname = root + ".png"
                elif type == "jpeg" and ext != ".jpg":
                    newname = root + ".jpg"
                
                # Rename file if it had the wrong extension
                if newname != None:
                    print("Image '{0}' has wrong extension, correcting to '{1}'".format(os.path.basename(filename), os.path.basename(newname)))
                    try:
                        os.rename(filename, newname)
                    except OSError:
                        # An error renaming the file most likely means it was already downloaded
                        os.unlink(filename)
                    return os.path.basename(newname)
                else:
                    return os.path.basename(filename)
                
                return os.path.basename(filename)
            else:
                # getImage only handles images, use getFile for other file types
                raise DownloadError('Unrecognized image type - "{0}"'.format(url))
        return os.path.basename(filename)
    
    def getFile(self, url, filename):
        if not os.path.exists(filename):
            urllib.request.urlretrieve(url, filename)
        return filename
    
    def getBlogImages(self, blog, ignoreList=[]):
        """Downloads all embedded images in blog post"""
        imgs = []
        newBlog = blog[:]
        blog = blog.replace("<IMG ", "<img ")
        for blogSeg in blog.split("<img")[1:]:
            blogSeg = blogSeg.replace('SRC=', 'src=')
            quoteChar = blogSeg[blogSeg.find("src=")+4]
            thisImg = blogSeg.split('src='+quoteChar, 1)[1].split(quoteChar, 1)[0]
            if thisImg not in ignoreList:
                imgs.append(thisImg)
        for img in imgs:
            downloadUrl = img.split("?", 1)[0]
            if downloadUrl.startswith("./"):
                downloadUrl = downloadUrl[2:]
            if not downloadUrl.startswith("http://"):
                downloadUrl = self.urlPrefix + downloadUrl
            downloadUrl = downloadUrl.replace("../", "")
            filename = "comics/blogimgs/{0}".format(os.path.basename(downloadUrl))
            filename = filename.replace("%20", " ")
            pathname = self.filePrefix + filename
            self.getImage(downloadUrl, pathname)
            newBlog = newBlog.replace(img, filename)
        return newBlog
    
    def getLinkedImages(self, blog):
        """Downloads all images linked in blog post"""
        imgs = []
        newBlog = blog[:]
        blog = blog.replace("<A ", "<a ")
        for blogSeg in blog.split("<a ")[1:]:
            tag = "<a " + blogSeg[:blogSeg.find(">")+1]
            tag = tag.replace(' HREF=', ' href=')
            quoteChar = tag[tag.find("href=")+5]
            # Make sure this is a tag that links
            if " href=" in tag:
                thisImg = tag.split('href='+quoteChar, 1)[1].split(quoteChar, 1)[0]
                imgs.append(thisImg)
        for img in imgs:
            # ditch the query string, some images won't download with it 
            downloadUrl = img.split("?", 1)[0]
            if downloadUrl[0:7] != "http://":
                downloadUrl = self.urlPrefix + downloadUrl
            downloadUrl = downloadUrl.replace("../", "")
            filename = "comics/blogimgs/{0}".format(os.path.basename(downloadUrl))
            filename = filename.replace("%20", " ")
            pathname = "{0}/{1}".format(self.filePrefix, filename)
            if filename[-4:] not in [".gif", ".png", ".jpg"]:
                continue
            try:
                self.getImage(downloadUrl, pathname)
            except DownloadError as e:
                # there are likely many broken links, silently continue on error
                # unlike embedded images, broken links do not break layout
                continue
            newBlog = newBlog.replace(img, filename)
        return newBlog
    
    def postprocess(self):
        """Stub for a postprocessing function"""
        pass
    
    def getUrls(self):
        """Stub for function that returns an iterator for the urls to get"""
        pass
    
    def getComicData(self):
        """Stub for function that downloads comic information"""
        pass
    
    def cleanup(self):
        self.writeComicDB()

class DownloadError(Exception):
    def __init__(self, message):
        self.message = message
    
def getMetadata(comicDir):
    infoFile = open("{0}/resource/info.txt".format(comicDir), "r")
    comicInfo = {}
    for line in infoFile:
        #skip blank lines
        if line.strip() != "":
            field, value = line.split(":", 1)
            comicInfo[field.strip()] = value.strip()
    
    comicInfo["timestamp"] = time.strftime("%B %d, %Y %H:%M:%S UTC", time.gmtime())
    # Placeholder for bonus, may get used if bonus.txt is present
    comicInfo["bonus"] = ""
    
    return comicInfo

def downloadArchive(comicRoot, stop=""):
    # Disable compilation, it clutters up the /resource directories for little gain.
    sys.dont_write_bytecode = True
    
    scraper = imp.load_source("scraper", "{0}/resource/scraper.py".format(comicRoot))
    
    downloader = scraper.ComicDownloader(comicRoot, haltUrl=stop)
    try:
        downloader.downloadComics()
    except DownloadError as e:
        print("Error updating comics: " + e.message)
        sys.exit(1)
    finally:
        downloader.cleanup()
    
    print("\nComic update complete, generating viewer")
    with open("{0}/resource/comicdb.js".format(downloader.filePrefix), "w") as dbFile:
        dbFile.write("var comicDB = " + json.dumps(downloader.db) + ";")
    templateParameters = getMetadata(downloader.filePrefix)
    pageTemplate = open("template.txt", "r").read()
    #BUG: if a template parameter is missing, handle the error gracefully
    pageText = Template(pageTemplate).substitute(templateParameters)
    with open("{0}/view.html".format(downloader.filePrefix), "w") as outfile:
        outfile.write(pageText)
    
    shutil.copyfile("comiclib.js", "{0}/resource/comiclib.js".format(downloader.filePrefix))
    shutil.copyfile("loading.gif", "{0}/resource/loading.gif".format(downloader.filePrefix))


# Start of the program #
########################

if __name__ == "__main__":
    if len(sys.argv) == 3:
        downloadArchive(sys.argv[1], stop=sys.argv[2])
    else:
        downloadArchive(sys.argv[1])
