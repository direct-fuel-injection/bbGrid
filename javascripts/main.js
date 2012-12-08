$(function(){  
    var models;
    $.getJSON("example.json", function(json) {
        models = json.result;
        var model = Backbone.Model.extend();
        var collection = Backbone.Collection.extend({
            model: model
        });		

        var MyCollection = new collection(models);
//        console.log(MyCollection);
        var MyGrid = new bbGrid.View({
            container: $('#bbGrid-example'),
            width: 700,
            rows: 25,
            rowList: [25,50, 100, 250, 500],
            collection: MyCollection,
            colModel: [{ title: 'ID', name: 'id', sorttype: 'number' },
                       { title: 'Full Name', name: 'name' },
                       { title: 'Company', name: 'company' },
                       { title: 'Email', name: 'email' }
            ]
        });
        
//        var companies = new collection(MyCollection.pluck('company'));
        var companies = new collection(_.map(_.uniq(_.pluck(models, 'company')), function(val, index){
            return {
                'id': index+1, 
                'company': val
            };
        
        }));
//        console.log(names);
        var MyGrid2 = new bbGrid.View({
            container: $('#bbGrid-example2'),
            width: 700,
            rows: 25,
            rowList: [25,50, 100, 250, 500],
            collection: companies,
            subgrid: true,
            subgridAccordion: true,
            colModel: [{ title: 'ID', name: 'id', sorttype: 'number' },
                       { title: 'Company', name: 'company' }
            ],
            onRowExpanded: function($el, rowid) {                
                var subgridCollection = new collection(MyCollection.where({'company' : companies.at(rowid).get('company')}));
                var subgrid = new bbGrid.View({
                    container: $el,
                    rows: 10,
                    rowList: [10,50,100, 250, 500],
                    collection: subgridCollection,                    
                    colModel: [ { title: 'Full Name', name: 'name' },
                       { title: 'Age', name: 'age', sorttype: 'number' },
                       { title: 'Address', name: 'address' },
                       { title: 'Email', name: 'email' }
                    ],
                    onRowExpanded: function($el, rowid) {

                    }
                });
            }
        });
        console.log(models);
    });
    
});