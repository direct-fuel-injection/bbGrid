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
    
    if(!this.collection){
        alert('bbGrid: collection param is undefined');
        return false;
    }
    
    this.collection.view = this;
    if(this.autofetch){
        var self = this;
        this.collection.fetch({silent: true, success: function(){ self.display(); } });
    }

    this.collection.bind('reset', this.render);
    this.on('selected', (this.subgrid) ? this.toggleSubgridRow : this.resetSelection);
    this.on('pageChanged', this.onPageChanged);
    this.on('sort', this.onSort);
    this.on('multiselect', this.onMultiselect);
    this.on('rowDblClick', this.onDblClick);
};

_.extend(bbGrid.View.prototype, Backbone.View.prototype, {
    tagName: 'div',
    className: 'bbGrid-container container',
    display: function(){
        this.render();
        this.$el.appendTo(this.container);
    },
    render: function(){
        console.log('Render', this);
        if(this.width) this.$el.css('width', this.width+'px');
        
        if(!this.$grid){
            this.$grid = $('<table class="bbGrid-grid table table-hover table-bordered table-condensed" />');
            if(this.caption)
                this.$grid.append('<caption>'+this.caption+'</caption>');
            this.$grid.appendTo(this.el);
            console.log('Table created');
        }
        if(!this.$thead){
            this.thead = new bbGrid.TheadView({view: this});
            this.$thead = this.thead.render();
            this.$grid.append(this.$thead);
            console.log('Columns created');
        }
//        if(!this.$topbar){
//            this.$topbar = $('<input name="search" type="text" placeholder="Поиск">');
//            this.$grid.before(this.$topbar);
//        }
        if(!this.$navBar){
            this.navBar = new bbGrid.NavView({view: this});
            this.$navBar = this.navBar.render();
            this.$grid.after(this.$navBar);
            console.log('Pager created');
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
    rsortBy: function(col){
        console.log(col);
        var isSort = (this.sortName && this.sortName == col.name) ? false: true;
        this.sortName = col.name;
        var sortType = (col.sorttype)? col.sorttype : 'string';
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
        
        var col = _.find(this.colModel, function(col){return col.title == $el.text();});
        if(!col) return false;
        this.rsortBy(col);
        
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
    onDblClick: function(model, $el){
        if(this.onRowDblClick)
            this.onRowDblClick(model);
    },
    onPageChanged: function(event){        
        var $el = $(event.currentTarget);
        var className = $el.attr('class');
        // get page number
        var page = parseInt((event.target.tagName == 'INPUT') ? $el.val(): $el.text());

        switch(className){
            case 'left':
                page = this.currPage - 1;
                break;
            case 'right':
                page = this.currPage + 1;
                break;
            case 'first':
                page = 1;
                break;
            case 'last':
                page = this.cntPages;
                break;
        }
        
        if (page > this.cntPages || page <= 0)
            page = null;
        
        if(page && this.currPage != page){
            this.currPage = page;
            // set active
            var liItems = $('div.bbGrid-pager li', this.$el);
            $('.bbGrid-page-input', this.$pager).val(this.currPage);
            liItems.removeClass('active');
            $(liItems[page]).addClass('active');
            if(this.currPage == 1){
                $('div.bbGrid-pager a.left,.first', this.$el).parent().addClass('active');
            }
            if(this.currPage >= this.cntPages)
                $('div.bbGrid-pager a.right,.last', this.$el).parent().addClass('active');
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
        "click td": "setSelection",
        "dblclick td": "onDblClick"
//        "click input[type=checkbox]": "setSelection"
    };
    Backbone.View.apply(this, [options]);
    /* alias to bbGrid.View*/
    this.view = options.view;
    this.on('select', this.setSelection);
};

_.extend(bbGrid.RowView.prototype, Backbone.View.prototype, {
    tagName: 'tr',
    onDblClick: function(event){
        this.view.trigger("rowDblClick", this.model, this.$el);
    },
    setSelection: function(event){
        
        this.view.trigger("selected", this.model, this.$el);
        
        if(this.view.subgrid == undefined || (this.view.multiselect && this.view.subgrid && event.target.tagName != 'I')){            
            this.$el.addClass('warning');
        }
        
        if(this.view.multiselect){
            this.selected = (this.selected) ? false : true;
            if(!this.view.subgrid || (this.view.subgrid && event.target.tagName != 'I'))
                $('input[type=checkbox]', this.$el).attr('checked', this.selected);
            if(!this.selected && event.target.tagName != 'I')
                this.$el.removeClass('warning');
        }
        if(this.view.onRowClick)
            this.view.onRowClick(this.model);
    },
    render: function(){
        var self = this;
        var row = _.template('<% if(isMultiselect){%><td><input type="checkbox"></td><%} if(isContainSubgrid){%><td><i class="icon-plus"></td><%} _.each(values, function(row){%><td><%=row.value%></td><%})%>')
        var cols = _.filter(this.view.colModel, function(col){ return !col.hidden; });               
        var html = row( {
            isMultiselect: this.view.multiselect,
            isContainSubgrid: this.view.subgrid,
            values: _.map(cols, function(col){col.value = self.model.attributes[col.name];return col;})});
        
        this.$el.html(html);
        return this;
    }
});

bbGrid.RowView.extend = Backbone.View.extend;

/* View of div pagination */
bbGrid.PagerView = function(options){
    this.events =  {
        'click a': 'onPageChanged',
//        'click i': 'onPageChanged',
        'change .bbGrid-pager-rowlist': 'onRowsChanged',
        'change .bbGrid-page-input': 'onPageChanged'
    };

    Backbone.View.apply(this, [options]);
    this.view = options.view;
};

_.extend(bbGrid.PagerView.prototype, Backbone.View.prototype, {
    tagName: 'div',
    className: 'bbGrid-pager-container span6 offset',
    onRowsChanged: function(event){
      this.view.rows = $(event.target).val();
      this.render();
      this.view.render();
    },
    onPageChanged: function(event){
        this.view.trigger('pageChanged', event);
    },
    initPager: function() {
        this.view.cntPages = Math.ceil(this.view.collection.length / this.view.rows);
        if(this.view.currPage){
            if(this.view.currPage > this.view.cntPages)
                this.view.currPage = this.view.cntPages;
        }
        else this.view.currPage = 1;
       
        var pager = _.template('<div class="span bbGrid-pager"><ul class="nav nav-pills"><li<%if(page == 1){%> class="active"<%}%>><a class="first">&nbsp;<i class="icon-step-backward"/></a></li><li <%if(page == 1){%> class="active"<%}%>><a class="left">&nbsp;<i class="icon-backward"/></a></li><li><div class="bbGrid-page-counter" style="float:left">Стр.</div><input class="bbGrid-page-input" value="<%=page%>" type="text"><div class="bbGrid-page-counter"> из <%=cntpages%> </div></li><li<%if(page == cntpages){%> class="active"<%}%>><a class="right">&nbsp;<i class="icon-forward"/></a></li><li<%if(page == cntpages){%> class="active"<%}%>><a class="last">&nbsp;<i class="icon-step-forward"/></a></ul></div><% if(rowlist){%><div class="bbGrid-page-counter" style="float:left; margin-top:2px">Cтрок на странице:</div><select class="bbGrid-pager-rowlist"><% _.each(rowlist, function(val){%><option <% if(rows == val){%>selected="selected"<%}%>><%=val%></option><%})%></select><%}%>');
        var pagerHtml = pager({page: this.view.currPage, cntpages: this.view.cntPages, rows: this.view.rows, rowlist: (this.view.rowList) ? this.view.rowList : false });
        this.$el.html(pagerHtml);
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
        var cols = _.filter(this.view.colModel, function(col){ return !col.hidden; });
        var theadHtml = row({
            isMultiselect: this.view.multiselect,
            isContainSubgrid: this.view.subgrid,
            values: _.map(cols, function(col){return (col.title) ? col.title : col.name;})
        });
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
            this.view.buttons = _.map(this.view.buttons, function(button){
                button.onClick = _.bind(button.onClick, self.view.collection);
                var btn = _.template('<button <%if(id){%>id="<%=id%>"<%}%> class="btn btn-mini" type="button"><%=title%></button>');
                var btnHtml = btn(button);
                $button = $(btnHtml).click(button.onClick)
                    .appendTo($buttonsContainer);
                return $button;
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