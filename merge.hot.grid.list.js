/**
 * GridList
 */
(function(){


  //-- Variables -----//

  //-- Constructor -----//

  function MergeHotGridList(gridHeader, model, isDataObj) {
    //if ( gridHeader.constructor.name == "GridHeader" ) //에러처리
    this.offsetRow = gridHeader.depth+1;
    this.colInfos = gridHeader.colInfos;

    this.values = [];
    this.model = model;
    this.isDataObj = isDataObj;
    this.hot;

    this.setValueInfo();
  };

  //-- private Methods -----//

  function setHot(hot){
    this.hot = hot;
  }

  function setValueInfo() {
    var model = this.model;
    var isDataObj = this.isDataObj;
    var colInfos = this.colInfos, offsetRow = this.offsetRow;
    //isDataObj 가 true colInfos 에 isFormula 이 있으면
    if (isDataObj && _.findIndex(colInfos, 'isFormula')>-1) {
      setFormulaValues.call(this, colInfos, model, offsetRow );
    }else{
      setSimpleValues.call(this, model, colInfos);
    }
  };

  // setFormulaValues Start --------------------------------------------------------
  function setFormulaValues( colInfos, model, offsetRow){
    for (var j=0;j<colInfos.length;j++) {
      var colInfo = colInfos[j],
          dataField = colInfo.dataField,
          subSumCells = [];
      if (colInfo.isFormula == 'colSum'){
        var formulaStr = getDepth(colInfo,'option.formula');
        if (formulaStr==undefined) return;
        setColFormulaValues(colInfos, model, offsetRow, dataField, formulaStr); //col 계산
      }else {
        var preCell = translateCellCoords(j, offsetRow);
        setRowFormulaValues.call(this, colInfo, model, offsetRow, j, dataField, subSumCells, preCell); //row 계산
      }
    }
  };
  //col 계산
  function setColFormulaValues(colInfos, model, offsetRow, dataField, formulaStr){
    for (var i = 0; i < model.length; i++) {
      var rowObj = model[i];
      var replaceStr = formulaStr.replace(/@\w+/g, function(str, p1, offset, s) {
        var colIdx = _.findIndex(colInfos, {dataField: str.substr(1)});
        return translateCellCoords(colIdx, offsetRow+i);
      });
      rowObj[dataField] = replaceStr;
    }
  }
  //row 계산
  function setRowFormulaValues( colInfo, model, offsetRow, j, dataField, subSumCells, preCell){
    for (var i = 0; i < model.length; i++) {
      var rowObj = model[i],
          formulaField = rowObj[colInfo.isFormula];
      var colIdx = j, rowIdx = offsetRow + i;
      if (!formulaField) {
        // subSum , totalSum 아닐 경우
        if(dataField) // render field 가 아닐 경우
          rowObj[dataField] = getValue.call(this, dataField, colInfo, rowObj, j, i);
        continue;
      }
      if (formulaField == "subSum") {
        rowObj[dataField] = "=SUM(" + preCell + ":" + translateCellCoords(colIdx, rowIdx - 1) + ")";
        preCell = translateCellCoords(colIdx, rowIdx + 1);
        subSumCells.push(translateCellCoords(colIdx, rowIdx));
      } else if (formulaField == "totalSum" && subSumCells.length > 0) {
        rowObj[dataField] = "=" + subSumCells.join("+");
      }
    }
  };
  // setFormulaValues End --------------------------------------------------------

  //setSimpleValues --------------------------------------------------------
  function setSimpleValues(model, colInfos){
    var dataFields = _.pluck(colInfos, 'dataField');
    var values = [];
    for (var i=0;i<model.length;i++){
      var rowObj = model[i], rowArr = [];
      for (var j=0;j<dataFields.length;j++){
        var dataField = dataFields[j], colInfo = colInfos[j];
        rowArr.push( getValue.call(this, dataField, colInfo, rowObj, j, i) );
      }
      values.push(rowArr);
    }
    this.values = values;
  }

  function getValue(dataField, colInfo, rowObj, colIdx, rowIdx){
    var value = rowObj[dataField];
    switch (colInfo.dataType){
      case 'date'  : if (value) value = moment(value).format('YYYY-MM-DD'); break;
      case 'custom':
        value = colInfo.valueFunc.call(this, dataField, rowObj);
        break;
    };
    return value;
  };
  //setSimpleValues end--------------------------------------------------------

  function mergeCells() {
    var offsetRow = this.offsetRow,
        colInfos = this.colInfos,
        model = this.model;
    if (this.hot){
      var temp = this.hot.getData();
      model = temp.slice(offsetRow, temp.length);
    }

    var result = [];
    for(var col=0;col<colInfos.length;col++){
      var colInfo = colInfos[col];
      var mergeRowField = colInfo.mergeRowField;
      if (colInfo.mergeRowField==undefined) continue;

      var bMergeRowStart=0, bMergeRowval=null;
      for(var row=offsetRow;row<model.length+offsetRow;row++){
        var rowObj = model[row-offsetRow];
        var rowVal = rowObj[mergeRowField];
        if (rowVal==undefined){
          bMergeRowStart = row;
        }
        if (rowVal != bMergeRowval){
          if (row-offsetRow>0 && row-bMergeRowStart>1){
            //console.log(bMergeRowStart, row,  col, row-bMergeRowStart);
            result.push({row:bMergeRowStart, col:col, colspan:1, rowspan:row-bMergeRowStart});
          }
          bMergeRowStart = row;
        }
        bMergeRowval = rowVal;
      }
      if (row-bMergeRowStart>1){
        //console.log("last",bMergeRowStart, row,  col, row-bMergeRowStart);
        result.push({row:bMergeRowStart, col:col, colspan:1, rowspan:row-bMergeRowStart});
      }
    }
    return result;
  };

  function getData(){
    if (!this.isDataObj){
      return this.values;
    }
    // code, date 등의 convert data를 model data에 반영
    for(var i=0; i< this.values.length; i++){
      var row = this.values[i];
      for(var j=0; j < row.length; j++ ){
        var colVal = row[j];
        var column = this.colInfos[j];
        if(column.dataField == undefined) continue;
        this.model[i][column.dataField] = colVal;
      }
    }
    return this.model;
  };

  //-- utils -----//
  function translateCellCoords(colIdx, rowIdx){
    return toChar(colIdx)+(rowIdx+1);
  };
  /**
   * convert number to string char, e.g 0 => A, 25 => Z, 26 => AA
   * @param {Number} num
   * @returns {String}
   */
  function toChar(num) {
    var s = '';
    while (num >= 0) {
      s = String.fromCharCode(num % 26 + 97) + s;
      num = Math.floor(num / 26) - 1;
    }
    return s.toUpperCase();
  };
  function getDepth(obj, path) {
    var tags = path.split("."), len = tags.length - 1;
    for (var i = 0; i < len; i++) {
      obj = obj[tags[i]];
      if (obj == undefined) return;
    }
    return obj[tags[len]];
  };

  //-- prototype Methods -----//
  MergeHotGridList.prototype.setValueInfo =setValueInfo;
  MergeHotGridList.prototype.setHot = setHot;
  MergeHotGridList.prototype.mergeCells =mergeCells;
  MergeHotGridList.prototype.getData = getData;


  /************************************
   Exposing GridList
   ************************************/
  this['MergeHotGridList'] = MergeHotGridList;

}).call(this);

