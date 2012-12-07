$(function(){
    var MyCollection = new Backbone.Collection();
    var MyGrid = new bbGrid.View({
			container: $('#bbGrid-example'),
			width: 700,
			rows: 25,
			//rowList: [25,50, 100, 250, 500],
			collection: MyCollection,
			colModel: [{title: 'ID', name: 'id', sorttype: 'number'},
				{title: 'Full Name', name: 'name'},
				{title: 'Company', name: 'company'},            
				{title: 'Email', name: 'email'}]
		});
    var models;
    $.getJSON("example.json", function(json) {
        models = json.result;
	MyCollection.add(models);
    });
});
