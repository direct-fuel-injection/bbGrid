/* 
 * Backbone.js + Bootstrap GridЋ  by dfi; 21.11.2012
 *
 */

var timeit = function(callback){
    var start = new Date();
    callback();
    var end = new Date();
    alert((1000 * (end.getSeconds() - start.getSeconds()) + end.getMilliseconds() - start.getMilliseconds()).toString() + "ms to render");
}

var bbGrid = {};

/* Main Container - top bar, table($grid), nav bar
 * Models of Collections must have [id] !
 * */

bbGrid.View = function(options){
    this.events =  {
        'keyup input[name=search]': 'onSearch'
    };
    this.rowViews = {};
    _.extend(this, options);
    Backbone.View.apply(this, [options]);
    _.bindAll(this, 'numberComparator', 'stringComparator');
    this.collection.view = this;
    this.on('selected', (this.subgrid) ? this.toggleSubgridRow : this.resetSelection);
    this.on('pageChanged', this.onPageChanged);
    this.on('sort', this.onSort);
    this.on('multiselect', this.onMultiselect);
};

_.extend(bbGrid.View.prototype, Backbone.View.prototype, {
    tagName: 'div',
    className: 'bbGrid-container container',
    display: function(){
        this.render();
        this.$el.appendTo(this.container);
    },
    render: function(){
        if(this.width) this.$el.css('width', this.width+'px');
        
        if(!this.$grid){
            this.$grid = $('<table class="bbGrid-grid table table-hover table-bordered table-condensed" />');
            if(this.caption)
                this.$grid.append('<caption>'+this.caption+'</caption>');
            this.$grid.appendTo(this.el);
        }
        if(!this.$thead){
            this.thead = new bbGrid.TheadView({view: this});
            this.$thead = this.thead.render();
            this.$grid.append(this.$thead);
        }
//        if(!this.$topbar){
//            this.$topbar = $('<input name="search" type="text" placeholder="Поиск">');
//            this.$grid.before(this.$topbar);
//        }
        if(!this.$navBar){
            this.navBar = new bbGrid.NavView({view: this});
            this.$navBar = this.navBar.render();
            this.$grid.after(this.$navBar);
        }
        
        this.renderPage();
        return this;
    },      
    numberComparator: function(model) {
        return model.get(this.sortName);
    },
    stringComparator: function(model){
        return model.get(this.sortName).toLowerCase();
    },
    rsortBy: function(index){
        var isSort = (this.sortName && this.sortName == this.colModel[index].name) ? false: true;
        this.sortName = this.colModel[index].name;
        var sortType = (this.colModel[index].sorttype)? this.colModel[index].sorttype : 'string';
        this.sortOrder = (this.sortOrder == 'asc') ? 'desc' : 'asc';
        var boundComparator;
        switch(sortType){
            case 'string':
                boundComparator = _.bind(this.stringComparator, this.collection);
                break;
            case 'number':
                boundComparator = _.bind(this.numberComparator, this.collection);
                break;
            default:
                boundComparator = _.bind(this.stringComparator, this.collection);
        }
        this.collection.models = (isSort) ? this.collection.sortBy(boundComparator) : this.collection.models.reverse()
    },
    getIntervalByPage: function (page){
        var interval = {};
        interval.s = (page - 1) * this.rows;
        interval.e = page * this.rows - 1;
        if( interval.e > this.collection.length)
            interval.e = this.collection.length;
        return interval;
    },
    clearGrid: function(){
        for(key in this.rowViews)
            this.rowViews[key].remove();
        this.rowViews = {};
//        $('tbody', this.$el).html('');
    },
    showCollection: function(collection){
        var self = this;
        this.clearGrid();
         _.each( collection, function(model) {
            self.renderRow(model);
        });
    },
    toggleSubgridRow: function(model, $el){
        if(this.$subgridContainer){
            $('td i', this.$subgridContainer.prev()).removeClass('icon-minus');
            
            this.$subgridContainer.remove();            
            delete this.$subgridContainer;
            
            if (this.expandedRowId == model.id)
                return false;
        }

        $('td i', $el).addClass('icon-minus');
        var colspan = (this.multiselect) ? 2 : 1;
        var subgridRow = _.template('<tr><td colspan="<%=extra%>"/><td colspan="<%=colspan %>"></td></tr>');
        var subgridContainerHtml = subgridRow({extra: colspan, colspan: this.colModel.length});

        this.$subgridContainer = $(subgridContainerHtml);
        $el.after(this.$subgridContainer);
        
//        _.bind(this.onRowExpanded, this);
        
        this.expandedRowId = model.id;
        this.onRowExpanded($('td',this.$subgridContainer)[1], model.id);
        
    },
    onMultiselect: function(event){
        for (key in this.rowViews)
            this.rowViews[key].trigger('select');
    },
    renderRow: function(model){
        var rowView = new bbGrid.RowView({model: model, view: this});
        this.$grid.append(rowView.render().el);
        this.rowViews[model.id] = rowView;
    },
    renderPage: function(){
        var interval = this.getIntervalByPage(this.currPage);
        this.showCollection(this.collection.models.slice(interval.s, interval.e));
    },
    onSort: function(event){
        var $el = $(event.currentTarget);
        $('thead th i', this.$el).removeClass();
        var index = _.indexOf(this.colNames, $el.text());
        if(index == -1)
            return false;
        this.rsortBy(index);
        if(this.sortOrder == 'asc')
            $('i', $el).addClass('icon-chevron-up');
        else
            $('i', $el).addClass('icon-chevron-down');

        this.renderPage();
    },
    onSearch: function(event){
        var $el = $(event.target);
        var text = $el.val();
        if (text){
            var pattern = new RegExp(text,"gi");
            var collection = _(this.collection.filter(function(data) {
                return pattern.test(data.get("bankname"));
            }));
            this.showCollection(collection._wrapped);
        }else
            this.renderPage();
    },
    onPageChanged: function(event){        
        var $el = $(event.target);
        var className = $el.attr('class');
        // get page number
        var page = parseInt($el.text());

        if (className == 'left') page = this.currPage - 1;
        if (className == 'right') page = this.currPage + 1;
        
        if (page > this.cntPages || page <= 0)
            page = null;
        
        if(page && this.currPage != page){
            this.currPage = page;
            // set active
            var liItems = $('div.pagination li', this.$el);            
            $('.bbGrid-page-input', this.$pager).val(this.currPage);
            liItems.removeClass('active');
            $(liItems[page]).addClass('active');
            if(this.currPage == 1)
                $('div.pagination a.left', this.$el).parent().addClass('active');
            if(this.currPage >= this.cntPages)
                $('div.pagination a.right', this.$el).parent().addClass('active');
            // set currPage
            this.renderPage();
        }
    },
    resetSelection: function(model){
        if(!this.multiselect)
            $('tr', this.$el).removeClass('warning');
    }
});

bbGrid.View.extend = Backbone.View.extend;

/* View of Model */
bbGrid.RowView = function(options){
    this.events = {
        "click td": "setSelection"
//        "click input[type=checkbox]": "setSelection"
    };
    Backbone.View.apply(this, [options]);
    /* alias to bbGrid.View*/
    this.view = options.view;
    this.on('select', this.setSelection);
};

_.extend(bbGrid.RowView.prototype, Backbone.View.prototype, {
    tagName: 'tr',
    setSelection: function(event){
        console.log(this.view.subgrid);
        if(this.view.subgrid == undefined || (this.view.multiselect && this.view.subgrid && event.target.tagName != 'I') )
            this.$el.addClass('warning');
        
        if(this.view.multiselect){
            this.selected = (this.selected) ? false : true;
            if(!this.view.subgrid || (this.view.subgrid && event.target.tagName != 'I'))
                $('input[type=checkbox]', this.$el).attr('checked', this.selected);
            if(!this.selected && event.target.tagName != 'I')
                this.$el.removeClass('warning');
        }
        
        this.view.trigger("selected", this.model, this.$el);
    },
    render: function(){
        var self = this;
        var row = _.template('<% if(isMultiselect){%><td><input type="checkbox"></td><%} if(isContainSubgrid){%><td><i class="icon-plus"></td><%} _.each(values, function(value){%><td><%=value%></td><%})%>')
        var cols = _.map(this.view.colModel, function(col){return col['name']});
        var html = row( {
            isMultiselect: this.view.multiselect,
            isContainSubgrid: this.view.subgrid,
            values: _.map(cols, function(colName){return self.model.attributes[colName];})
        });
        
        this.$el.html(html);
        return this;
    }
});

bbGrid.RowView.extend = Backbone.View.extend;

/* View of div pagination */
bbGrid.PagerView = function(options){
    this.events =  {
        'click a': 'onPageChanged'
    };

    Backbone.View.apply(this, [options]);
    this.view = options.view;
};

_.extend(bbGrid.PagerView.prototype, Backbone.View.prototype, {
    tagName: 'div',
    className: 'pagination pagination-right pagination-mini offset',
    onPageChanged: function(event){
        this.view.trigger('pageChanged', event);
    },
    initPager: function() {
        this.view.cntPages = Math.ceil(this.view.collection.length / this.view.rows);
        var pagerHtml = _.template('<ul><li class="active"><a class="left">«</a></li><li><input class="bbGrid-page-input" value="1" type="text"></li><li><a class="right">»</a></li></ul>', {});
        this.$el.html(pagerHtml);
        if(!this.view.currPage)
            this.view.currPage = 1;
    },
    render: function(){
        this.initPager();
        return this.$el;
    }
});

bbGrid.PagerView.extend = Backbone.View.extend;

/* View of thead */
bbGrid.TheadView = function(options){
    this.events =  {
        'click th': 'onSort',
        'click input[type=checkbox]': 'onAllCheckbox'
    };

    Backbone.View.apply(this, [options]);
    this.view = options.view;
};

_.extend(bbGrid.TheadView.prototype, Backbone.View.prototype, {
    tagName: 'thead',
    className: 'bbGrid-grid-head',
    onAllCheckbox: function(event){
        this.view.trigger('multiselect', event);
    },
    onSort: function(event){
        this.view.trigger('sort', event);
    },
    render: function(){
//        var colNames = (this.view.colNames == undefined) ? _(this.view.collection.at(0).attributes).keys() : this.view.colNames;
        var row = _.template('<tr><% if(isMultiselect){%><th style="width:15px"><input type="checkbox"></th><%} if(isContainSubgrid){%><th style="width:15px"/><%} _.each(values, function(value){%><th><%=value%><i /></th><%})%></tr>');
        var theadHtml = row( {isMultiselect: this.view.multiselect, isContainSubgrid: this.view.subgrid, values: this.view.colNames});
        this.$el.html(theadHtml);
        
        return this.$el;
    }
});

bbGrid.TheadView.extend = Backbone.View.extend;

/* View of NavBar */
bbGrid.NavView = function(options){
    Backbone.View.apply(this, [options]);
    this.view = options.view;
};

_.extend(bbGrid.NavView.prototype, Backbone.View.prototype, {
    tagName: 'div',
    className: 'bbGrid-grid-nav row',
    render: function(){
        if(this.view.buttons){
            var self = this;
            var $button;
            var $buttonsContainer = $('<div class="bbGrid-navBar-buttonsContainer btn-group span6"/>');
            _.each(this.view.buttons, function(handler, name){
                handler = _.bind(handler, self.view.collection);
                $button = $('<button class="btn btn-primary btn-mini" type="button">'+name+'</button>')
                    .click(handler).appendTo($buttonsContainer);
            });
            this.$el.append($buttonsContainer);
        }
        if(!this.view.$pager){
            this.view.pager = new bbGrid.PagerView({view: this.view});
            this.view.$pager = this.view.pager.render();
            this.view.$pager.appendTo(this.$el);
        }
        return this.$el;
    }
});

bbGrid.NavView.extend = Backbone.View.extend;