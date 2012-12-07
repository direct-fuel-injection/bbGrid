$(function(){  
    var models;
    $.getJSON("example.json", function(json) {
        models = json.result;
		var model = Backbone.Model.extend();
		var collection = Backbone.Collection.extend({
			model: model
		});		

		var MyCollection = new collection(models);
		console.log(MyCollection);
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
    });
});