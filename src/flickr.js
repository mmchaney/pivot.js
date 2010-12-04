
(function (window) {

  var pivot = window.pivot || (window.pivot = {});

  pivot.flickr = {
    captionTemplate: '<h1><a href="{pageURL}" target="blank" tabindex="-1">{title}</a></h1><p> By {ownername}</p>',
    
    sourceURLs: {
      high: 'http://farm{farm}.static.flickr.com/{server}/{id}_{secret}_b.jpg',
      medium: 'http://farm{farm}.static.flickr.com/{server}/{id}_{secret}_z.jpg',
      low: 'http://farm{farm}.static.flickr.com/{server}/{id}_{secret}_m.jpg'
    },
    
    pageURL: 'http://www.flickr.com/photos/{owner}/{id}',

    feeds: {
      user: 'http://api.flickr.com/services/rest/?method=flickr.people.getPublicPhotos&api_key=6fff138dbd0fbe330c07a67c47c9cc21&user_id={userId}&per_page={perPage}&page={page}&extras=description,owner_name&format=json&nojsoncallback=1',

      group: 'http://api.flickr.com/services/rest/?method=flickr.groups.pools.getPhotos&api_key=6fff138dbd0fbe330c07a67c47c9cc21&group_id={groupId}&per_page={perPage}&page={page}&extras=description,owner_name&format=json&nojsoncallback=1',

      interesting: 'http://api.flickr.com/services/rest/?method=flickr.interestingness.getList&api_key=6fff138dbd0fbe330c07a67c47c9cc21&per_page={perPage}&page={page}&extras=description,owner_name&format=json&nojsoncallback=1'
    }
  };

}(this));