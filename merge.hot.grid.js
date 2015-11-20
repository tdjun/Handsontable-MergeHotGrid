/**
 * Merge handsontable Grid
 */
(function(){


  //-- Variables -----//


  //-- Constructor -----//
  function MergeHotGrid(colInfo, rowData, headerHeight){

    var gridHeader = new MergeHotGridHeader(colInfo, headerHeight, true);
    this.gridHeader = gridHeader;
    this.gridList = new MergeHotGridList(gridHeader, rowData, true);

    gridHeader.setMergeHotGrid(this);
  };

  function initData() {
    var gridHeader = this.gridHeader,
        gridList = this.gridList;
    var result = _.union( gridHeader.getData(), gridList.getData() );
    return result;
  }

  //{row: 1, col: 0, renderer: greenRenderer}
  function getObjCell(){
    return this.gridHeader.getCellPropertiesFunc();
  };

  function getMergeCells(){
    var gridHeader = this.gridHeader,
        gridList   = this.gridList;
    return _.union( gridHeader.mergeCells(), gridList.mergeCells() );
  }

  ///-----------
  function renderHandsontable(container, prop){
    var hot = new Handsontable(container, prop);
    this.hot = hot;
    this.gridList.setHot(hot);

    return hot;
  };

  function getData() {
    var headerDepth = this.gridHeader.depth + 1,
        hotData = this.hot.getData();
    var colInfos = this.gridHeader.colInfos;
    var gridList = this.gridList;
    // data convert
    var resultData = [];
    _.each(hotData.slice(headerDepth), function (data) {
      var obj = new Object();
      _.map(data, function (val, key) {
        var colInfo = _.find(colInfos, function (colInfo) {
          return colInfo.dataField == key
        });
        // String => Date
        if (colInfo != undefined && colInfo.dataType != undefined && colInfo.dataType == 'date') {
          //data[key] = moment(val).format();
          val = moment(val).format();
        }
        // codeNm => code
        if (colInfo != undefined && colInfo.dataType != undefined && colInfo.dataType == 'code') {
          var option = colInfo.option;
          var code = gridList.getStrCode(val, option);
          //console.log("code",code);
          val = code;
        }
        obj[key] = val
      });
      resultData.push(obj);
    });
    return resultData;
  }

  function addBtnClick(instance, callback){
    var data = instance.getData();
    var selectedObj;
    //instance.getSelected() [startRow, startCol, endRow, endCol].
    if ( instance.getSelected() ){
      var endRow = instance.getSelected()[2];
      if(endRow < this.gridHeader.depth) return;
      selectedObj = data[endRow];
      callback(data, selectedObj, endRow);
    }else{
      callback(data);
    }
    instance.mergeCells = new Handsontable.MergeCells( this.getMergeCells() );
    instance.render();
  };


  //-- prototype Methods -----//

  MergeHotGrid.prototype.initData = initData;
  MergeHotGrid.prototype.getGridHeader = function() { return this.gridHeader; };
  MergeHotGrid.prototype.getGridList = function() { return this.gridList; };
  MergeHotGrid.prototype.getObjCell = getObjCell;
  MergeHotGrid.prototype.getData = getData;
  MergeHotGrid.prototype.getMergeCells = getMergeCells;

  MergeHotGrid.prototype.renderHandsontable = renderHandsontable;
  MergeHotGrid.prototype.addBtnClick = addBtnClick;

  /************************************
   Exposing GridList
   ************************************/
  this['MergeHotGrid'] = MergeHotGrid;

}).call(this);

