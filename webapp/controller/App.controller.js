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
        const oMessageManager = sap.ui.getCore().getMessageManager();
        const oMessageModel = oMessageManager.getMessageModel();
        const oMessageModelBinding = oMessageModel.bindList(
          "/",
          undefined,
          [],
          new Filter("technical", FilterOperator.EQ, true)
        );

        var oViewModel = new JSONModel({
          busy: false,
          hasUIChanges: false,
          usernameEmpty: true,
          order: 0,
        });

        this.getView().setModel(oViewModel, "appView");
        this.getView().setModel(oMessageModel, "message");

        oMessageModelBinding.attachChange(this.onMessageBindingChange, this);
        this._bTechnicalErrors = false;
      },

      onCreate: function () {
        const oList = this.byId("peopleList");
        const oBinding = oList.getBinding("items");
        const oContext = oBinding.create({
          UserName: "",
          FirstName: "",
          LastName: "",
          Age: "18",
        });
        this._setUIChanges();
        this.getView().getModel("appView").setProperty("/usernameEmpty", true);
        oList.getItems().some((oItem) => {
          if (oItem.getBindingContext() === oContext) {
            oItem.focus();
            oItem.setSelected(true);
            return true;
          }
        });
      },

      onDelete: function () {
        const oSelected = this.byId("peopleList").getSelectedItem();
        if (oSelected) {
          oSelected
            .getBindingContext()
            .delete("$auto")
            .then(
              () => {
                MessageToast.show(this._getText("deletionSuccessMessage"));
              },
              (oError) => {
                MessageBox.error(oError.message);
              }
            );
        }
      },

      onInputChange: function (oEvt) {
        if (oEvt.getParameter("escPressed")) {
          this._setUIChanges();
        } else {
          this._setUIChanges(true);
          const sUserName = oEvt
            .getSource()
            .getParent()
            .getBindingContext()
            .getProperty("UserName");
          console.log("UserName", sUserName);
          if (sUserName) {
            this.getView()
              .getModel("appView")
              .setProperty("/usernameEmpty", false);
          }
        }
        console.log(
          "/usernameEmpty",
          this.getView().getModel("appView").getProperty("/usernameEmpty")
        );
      },

      onRefresh: function () {
        const oBinding = this.byId("peopleList").getBinding("items");
        if (oBinding.hasPendingChanges()) {
          MessageBox.error(this._getText("refreshNotPossibleMessage"));
        }

        oBinding.refresh();
        MessageToast.show(this._getText("refreshSuccessMessage"));
      },

      onResetChanges: function () {
        this.byId("peopleList").getBinding("items").resetChanges();
        this._bTechnicalErrors = false;
        this._setUIChanges();
      },

      onResetDataSource: function () {
        const oModel = this.getView().getModel();
        const oOperation = oModel.bindContext("/ResetDataSource(...)");
        oOperation
          .execute()
          .then(() => {
            oModel.refresh();
            MessageToast.show(this._getText("sourceResetSuccessMessage"));
          })
          .catch((oError) => {
            MessageBox.error(oError.message);
          });
      },

      onSave: function () {
        const fnSuccess = () => {
          this._setBusy(false);
          MessageToast.show(this._getText("changesSentMessage"));
          this._setUIChanges(false);
        };

        const fnError = (oError) => {
          this._setBusy(false);
          this._setUIChanges(false);
          MessageBox.error(oError.message);
        };

        // Lock UI until submitBatch is resolved.
        this._setBusy(true);
        this.getView()
          .getModel()
          .submitBatch("peopleGroup")
          .then(fnSuccess, fnError);

        // If there were technical errors, a new save resets them.
        this._bTechnicalErrors = false;
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
        console.log("iOrder", iOrder);

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

      onMessageBindingChange: function (oEvent) {
        const aContexts = oEvent.getSource().getContexts();
        let aMessages;
        let bMessageOpen = false;

        if (bMessageOpen || !aContexts.length) {
          return;
        }

        // Extract and remove the technical messages
        aMessages = aContexts.map((oContext) => {
          return oContext.getObect();
        });
        sap.ui.getCore().getMessageManager().removeMessages(aMessages);
        this._setUIChanges(true);
        this._bTechnicalErrors = true;
        MessageBox.error(aMessages[0].message, {
          id: serviceErrorMessageBox,
          onClose: function () {
            bMessageOpen = false;
          },
        });

        bMessageOpen = true;
      },

      onSelectionChange: function (oEvent) {
        const oDetailArea = this.byId("detailArea");
        const oLayout = this.byId("defaultLayout");

        // get binding of selected item
        const oUserContext = oEvent
          .getParameters()
          .listItem.getBindingContext();

        const oOldContext = oDetailArea.getBindingContext();
        const oSearchField = this.byId("searchField");

        // remove keepAlive from old context
        if (oOldContext) {
          oOldContext.setKeepAlive(false);
        }

        // set binding
        oDetailArea.setBindingContext(oUserContext);

        // set keepAlive for new context
        oUserContext.setKeepAlive(true, function () {
          // hides detail area when context is destroyed
          oLayout.setSize("100%");
          oLayout.setResizable(false);
          oDetailArea.setVisible(false);
          oSearchField.setWidth("20%");
        });

        // resize view
        oDetailArea.setVisible(true);
        oLayout.setSize("60%");
        oLayout.setResizable(true);
        oSearchField.setWidth("40%");
      },

      _setUIChanges: function (bHasUIChanges) {
        if (this._bTechnicalErrors) {
          // If there is currently a technical error, then force 'true'.
          bHasUIChanges = true;
        } else if (bHasUIChanges === undefined) {
          bHasUIChanges = this.getView().getModel().hasPendingChanges();
        }
        const oModel = this.getView().getModel("appView");
        oModel.setProperty("/hasUIChanges", bHasUIChanges);
        console.log("hasUIChanges", oModel.getProperty("/hasUIChanges"));
      },

      _setBusy: function (bIsBusy) {
        this.getView().getModel("appView").setProperty("/busy", bIsBusy);
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
