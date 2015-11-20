
(function(){

  //-- Variables -----//

  var colInfo = {
    dataField: null,
    label: null,
    children: null,
    width: null,
    dataType: null,   //date, amt, num
    renderType: null, //file, popup, url, removeRow
    option: {
      dateFormat: null, //dataType:date -> YYYY.MM.DD
    },
    style: {},
    valueFunc: null, //function(value, colVO)
    dataFunc: null,  //function(value, colVO)
    labelFunc: null, //function(value, colVO)
    mergeRowField: null,
  };

  //-- Constructor -----//
  function MergeHotGridHeader(model, headerHeight, isDataObj) {
    this.leafNodes = [];
    this.groupNodes = [];
    this.colInfos = [];
    this.depth = 0;
    this.values = [];
    this.objValue = [];
    this.headerHeight = 35;

    this.setColInfo(model, headerHeight, isDataObj);
  };

  //-- private Methods -----//

  function setMergeHotGrid(mergeHotGrid){
    this.mergeHotGrid = mergeHotGrid;
  }

  function setColInfo(model, headerHeight, isDataObj) {
    var leafNodes = this.leafNodes,
      groupNodes = this.groupNodes,
      colInfos = this.colInfos,
      depth = this.depth, me=this;
    var root = new TreeModel().parse({ id: 'root', children: model});
    var col=0,row= 0;

    root.walk(function (node) {
      if (node.isRoot()) return;

      row = node.getPath().length-2;
      depth = Math.max(depth, row);
      node.row = row;node.col = col;
      var label = node.model.label, dataField = node.model.dataField;
      if (isDataObj){
        me.setDataObjVaule(row, col, label, dataField);
      }else{
        me.setDataVaule(row, col, label);
      }
      if ( !node.hasChildren() ) {
        leafNodes.push(node);
        colInfos.push(node.model);
        col++;
      }else{
        groupNodes.push(node);
      }
    });
    this.depth = depth;
    this.headerHeight = headerHeight||this.headerHeight;
    this.isDataObj = isDataObj;
    //console.log(depth);
    //console.log(me.getData());
    //console.log(me.mergeCells() );
    //console.log( this.objValue );
    if (isDataObj){
      var leafModel = _.pluck(leafNodes,'model');
      //TODO SH: 수정
      var columns = [];
      _.each(leafModel,function(column){
        // dataType convert
        if(column.dataType == 'date'){
          column.type = column.dataType;
          column.dateFormat = column.dateFormat == null ? 'YYYY-MM-DD': column.dateFormat;
        }
        columns.push({
          data: column.dataField,
          type: column.type,
          editor: column.editor,
          source: column.source,
          format: column.format,
          selectOptions : column.selectOptions,
          dateFormat : column.dateFormat,
          validator: column.validator,
          renderer: column.renderer,
          readOnly: column.readOnly
        });
      });
      //var dataFields = _.pluck(leafModel,'dataField');
      //var columns = [];
      //_.each(dataFields,function(dataField){
      //  columns.push({data: dataField});
      //});
      this.columns = columns;
    }
  };

  function setDataVaule(row, col, value){
    var values = this.values;
    if (values[row]==undefined) values[row]=[];
    values[row][col] = value;
  };

  function setDataObjVaule(row, col, value, dataField){
    if (dataField==undefined) return;
    var objValue = this.objValue;
    if (objValue[row]==undefined) objValue[row]={};
    setDepthValue(objValue[row],dataField,value);
  };

  function getData(){
    var reuslt=[],
      depth = this.depth,leafNodes = this.leafNodes,
      values = this.values;

    if (this.isDataObj){
      return this.objValue;
    }

    for(var i=0;i<=depth;i++){
      var eachArr = [];
      for(var j=0;j<leafNodes.length;j++){
        eachArr.push(
          values[i][j]?values[i][j]:""
        );
      }
      reuslt.push( eachArr );
    }
    return reuslt;
  }

  //[{ row: 5, col: 0, rowspan: 1, colspan: 14 }]
  function mergeCells(offsetRow, offsetCol) {
    var result = [],
      leafNodes = this.leafNodes, groupNodes = this.groupNodes,
      depth = this.depth;
    //rowMerge
    for(var i=0;i<leafNodes.length;i++){
      var node = leafNodes[i];
      var parentCnt = node.getPath().length-1;
      if (parentCnt<=depth){
        result.push({row: parentCnt-1, col: i, rowspan: depth+2-parentCnt, colspan:1});
      }
    }
    //colMerge
    for(var i=0;i<groupNodes.length;i++){
      var node = groupNodes[i];
      var cnt=-1, groupCnt=-1;
      node.all(function (node) {
        //console.log(node.model.id, node.children.length)
        if (node.children.length>0){ groupCnt++; }
        cnt++;
      });
      result.push({row: node.row, col: node.col, rowspan: 1, colspan:cnt-groupCnt});
      //console.log(node.model.id, node.row, node.col, 1, cnt, groupCnt);
    }
    return result;
  };

  function getCellPropertiesFunc() {
    var depth = this.depth, colInfos = this.colInfos;
    var mergeHotGrid = this.mergeHotGrid;
    var model = mergeHotGrid.gridList.model;
    var me = this;
    return function (row, col, prop) {
      var cellProperties = {};
      if (row <= depth){
        switch(colInfos[col].headerRenderer){
          case 'addRow':
            cellProperties.renderer = addRowHeaderRenderer.call(me,colInfos[col], mergeHotGrid);
            cellProperties.readOnly = true;
            break;
          default:
            cellProperties.renderer = headerRenderer.call(me);
            cellProperties.readOnly = true;
            break;
        }
      }else{

        switch(colInfos[col].renderType){
          case 'file':
          case 'popup':
          case 'html':
          case 'img':
            var renderFunc = colInfos[col].rendererFunc;
            cellProperties.renderer = renderFunc.call(me, colInfos[col], colInfos);
            cellProperties.readOnly = true;
            break;
          case 'removeRow':
            cellProperties.renderer = removeRowRenderer;
            break;
          default:
            //TODO : 수식이 Text로 나오기때문에 수정필요
            cellProperties.renderer = colInfos[col].renderer || textCellRenderer.call(me, colInfos[col]);
            break;
        }
        switch(colInfos[col].dataType){
          case 'num':
            cellProperties.format='0,0';
            cellProperties.renderer = colInfos[col].renderer || numberCellRenderer.call(me, colInfos[col]);
            break;
        }
        switch(colInfos[col].type){
          case 'numeric':
            cellProperties.renderer = colInfos[col].renderer || numberCellRenderer.call(me, colInfos[col]);
            break;
        }

        // 수식 renderer
        if(colInfos[col].isFormula){
          cellProperties.renderer = formulaRenderer.call(me, colInfos[col]);
        }

        // 합계 row readOnly 설정 추가
        var rowData = model[row - (depth+1)];
        if(rowData && (rowData.formula == 'subSum' || rowData.formula == 'totalSum') ){
          cellProperties.readOnly = true;
        }
      }
      //console.log('row', row, 'col', col, 'label', colInfos[col].label, cellProperties);
      return cellProperties;
    };
  };

  //{row: 1, col: 0, renderer: greenRenderer}
  function getObjCellProperties() {
    var result = [];
    var depth = this.depth+1, colInfos = this.colInfos;
    for(var i=0;i<depth;i++){
      for(var j=0;j<colInfos.length;j++){
        var colInfo = colInfos[j];
        switch(colInfo.headerRenderer){
          case 'addRow':
            result.push({row: i, col: j, renderer: addRowHeaderRenderer.call(this), readOnly: true});
            break;
          default:
            result.push({row: i, col: j, renderer: headerRenderer.call(this), readOnly: true});
            break;
        }
      }
    }
    return result;
  };

  function getColumns(){ return this.columns };

  function getColWidths(){
    var leafNodes = this.leafNodes;
    var leafModel = _.pluck(leafNodes,'model');
    var widths = _.pluck(leafModel,'width');
    return widths;
  }

  function customBorders(){
    var leafNodes = this.leafNodes;
    return [{
      range: {
        from: {row: 0, col: 0},
        to: {row: this.depth, col: leafNodes.length-1}
      },
      bottom: { width: 2, color: '#5292F7' }
    }];
  }


  //-- utils -----//
  // nestedObjects
  // http://stackoverflow.com/questions/10253307/setting-a-depth-in-an-object-literal-by-a-string-of-dot-notation
  function setDepthValue(obj, path, value) {
    var tags = path.split("."), len = tags.length - 1;

    for (var i = 0; i < len; i++) {
      if (obj[tags[i]]==undefined){
        obj[tags[i]]={};
      }
      obj = obj[tags[i]];
    }
    obj[tags[len]] = value;
  };

  //-------------------------------------------------------------------------------------------
  // handsontable renderer
  //-------------------------------------------------------------------------------------------
  function headerRenderer(){
    var headerHeight = this.headerHeight;
    return function (instance, TD, row, col, prop, value, cellProperties) {
      Handsontable.renderers.TextRenderer.apply(this, arguments);
      TD.className = 'htMergeHeader';
      TD.setAttribute('style', 'height:'+headerHeight+'px;');
    };
  }

  function addRowHeaderRenderer(colInfo, mergeHotGrid){
    var headerHeight = this.headerHeight;
    var me = this;
    return function (instance, TD, row, col, prop, value, cellProperties){
      Handsontable.renderers.TextRenderer.apply(this, arguments);

      if (!TD.firstChild) { //http://jsperf.com/empty-node-if-needed
        //otherwise empty fields appear borderless in demo/renderers.html (IE)
        TD.appendChild(document.createTextNode(String.fromCharCode(160))); // workaround for https://github.com/handsontable/handsontable/issues/1946
        //this is faster than innerHTML. See: https://github.com/handsontable/handsontable/wiki/JavaScript-&-DOM-performance-tips
      }

      var button = document.createElement('div');
      Handsontable.Dom.addClass(button, 'btn');
      button.innerHTML = '<i class="fa fa-plus"></i>';

      Handsontable.Dom.addEvent(button, 'mousedown', function (e){
        e.preventDefault();
        e.stopImmediatePropagation();
        if (colInfo.addFunc==undefined) return;
        mergeHotGrid.addBtnClick.call(mergeHotGrid, instance, colInfo.addFunc);
      });
      Handsontable.Dom.addClass(TD, 'htEditRow');
      Handsontable.Dom.addClass(TD, 'htMergeHeader');
      TD.setAttribute('style', 'height:'+headerHeight+'px;');
      TD.appendChild(button);
    }
  }

  function removeRowRenderer(instance, TD, row, col, prop, value, cellProperties){
    Handsontable.renderers.TextRenderer.apply(this, arguments);

    if (!TD.firstChild) { //http://jsperf.com/empty-node-if-needed
      //otherwise empty fields appear borderless in demo/renderers.html (IE)
      TD.appendChild(document.createTextNode(String.fromCharCode(160))); // workaround for https://github.com/handsontable/handsontable/issues/1946
      //this is faster than innerHTML. See: https://github.com/handsontable/handsontable/wiki/JavaScript-&-DOM-performance-tips
    }

    var button = document.createElement('div');
    Handsontable.Dom.addClass(button, 'btn');
    button.innerHTML = '<i class="fa fa-trash"></i>';

    Handsontable.Dom.addEvent(button, 'mousedown', function(e){
      e.preventDefault();
      instance.alter("remove_row", row);
    });
    Handsontable.Dom.addClass(TD, 'htEditRow');
    TD.appendChild(button);
  }



  function formulaRenderer(colInfo){
    return  function (instance, td, row, col, prop, value){
      Handsontable.cellTypes['formula'].renderer.apply(this, arguments);
      return td;
    }
  }
  // 텍스트 렌더러
  function textCellRenderer(colInfo){
    return function (instance, td, row, col, prop, value){
      Handsontable.renderers.TextRenderer.apply(this, arguments);
      if(colInfo.style) td.style = _.extend(td.style, colInfo.style);
      return td;
    }
  }
  // 숫자형 렌더러
  function numberCellRenderer(colInfo){
    return function (instance, td, row, col, prop, value){
      Handsontable.NumericCell.renderer.apply(this, arguments);
      if(colInfo.style) td.style = _.extend(td.style, colInfo.style);
      return td;
    }
  }


  //-- prototype Methods -----//
  MergeHotGridHeader.prototype.setColInfo = setColInfo;
  MergeHotGridHeader.prototype.setDataVaule = setDataVaule;
  MergeHotGridHeader.prototype.setDataObjVaule = setDataObjVaule;
  MergeHotGridHeader.prototype.setMergeHotGrid = setMergeHotGrid;
  MergeHotGridHeader.prototype.getData = getData;
  MergeHotGridHeader.prototype.mergeCells =mergeCells;
  MergeHotGridHeader.prototype.getCellPropertiesFunc =getCellPropertiesFunc;
  MergeHotGridHeader.prototype.getObjCellProperties =getObjCellProperties;
  MergeHotGridHeader.prototype.getColumns = getColumns;
  MergeHotGridHeader.prototype.getColWidths = getColWidths;

  MergeHotGridHeader.prototype.customBorders =customBorders;

  /************************************
   Exposing GridHeader
   ************************************/
  this['MergeHotGridHeader'] = MergeHotGridHeader;

}).call(this);
