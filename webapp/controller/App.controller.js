sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Sorter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/FilterType",
  ],
  function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    Sorter,
    Filter,
    FilterOperator,
    FilterType
  ) {
    "use strict";

    return Controller.extend("sap.ui.core.tutorial.odatav4.controller.App", {
      /**
       *  Hook for initializing the controller
       */
      onInit: function () {
        var oJSONData = {
          busy: false,
          order: 0,
        };
        var oModel = new JSONModel(oJSONData);
        this.getView().setModel(oModel, "appView");
      },

      onRefresh: function () {
        const oBinding = this.byId("peopleList").getBinding("items");
        if (oBinding.hasPendingChanges()) {
          MessageBox.error(this._getText("refreshNotPossibleMessage"));
        }

        oBinding.refresh();
        MessageToast.show(this._getText("refreshSuccessMessage"));
      },

      onSearch: function () {
        const oView = this.getView();
        const sValue = oView.byId("searchField").getValue();
        const oFilter = new Filter("LastName", FilterOperator.Contains, sValue);
        oView
          .byId("peopleList")
          .getBinding("items")
          .filter(oFilter, FilterType.Application);
      },

      onSort: function () {
        const oView = this.getView();
        const aStates = [undefined, "asc", "desc"];
        const aStateTextIds = ["sortNone", "sortAscending", "sortDescending"];

        let sMessage;
        let iOrder = oView.getModel("appView").getProperty("/order");

        iOrder = (iOrder + 1) % aStates.length;
        console.log(iOrder);

        const sOrder = aStates[iOrder];

        oView.getModel("appView").setProperty("/order", iOrder);
        oView
          .byId("peopleList")
          .getBinding("items")
          .sort(sOrder && new Sorter("LastName", sOrder === "desc"));

        sMessage = this._getText("sortMessage", [
          this._getText(aStateTextIds[iOrder]),
        ]);
        MessageToast.show(sMessage);
      },

      _getText: function (sTextId, aArgs) {
        return this.getOwnerComponent()
          .getModel("i18n")
          .getResourceBundle()
          .getText(sTextId, aArgs);
      },
    });
  }
);
