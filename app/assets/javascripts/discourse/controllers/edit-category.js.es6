import ModalFunctionality from "discourse/mixins/modal-functionality";
import DiscourseURL from "discourse/lib/url";
import { extractError } from "discourse/lib/ajax-error";

// Modal for editing / creating a category
export default Ember.Controller.extend(ModalFunctionality, {
  selectedTab: null,
  saving: false,
  deleting: false,
  panels: null,
  hiddenTooltip: true,

  _initPanels: function() {
    this.set("panels", []);
  }.on("init"),

  onShow() {
    this.changeSize();
    this.titleChanged();
    this.set("hiddenTooltip", true);
  },

  changeSize: function() {
    if (!Ember.isEmpty(this.get("model.description"))) {
      this.set("modal.modalClass", "edit-category-modal full");
    } else {
      this.set("modal.modalClass", "edit-category-modal small");
    }
  }.observes("model.description"),

  title: function() {
    if (this.get("model.id")) {
      return I18n.t("category.edit_dialog_title", {
        categoryName: this.get("model.name")
      });
    }
    return I18n.t("category.create");
  }.property("model.id", "model.name"),

  titleChanged: function() {
    this.set("modal.title", this.get("title"));
  }.observes("title"),

  disabled: function() {
    if (this.get("saving") || this.get("deleting")) return true;
    if (!this.get("model.name")) return true;
    if (!this.get("model.color")) return true;
    return false;
  }.property("saving", "model.name", "model.color", "deleting"),

  deleteDisabled: function() {
    return this.get("deleting") || this.get("saving") || false;
  }.property("disabled", "saving", "deleting"),

  categoryName: function() {
    const name = this.get("name") || "";
    return name.trim().length > 0 ? name : I18n.t("preview");
  }.property("name"),

  saveLabel: function() {
    if (this.get("saving")) return "saving";
    return this.get("model.id") ? "category.save" : "category.create";
  }.property("saving", "model.id"),

  actions: {
    saveCategory() {
      const model = this.get("model");

      const parentCategory = this.site
        .get("categories")
        .findBy("id", parseInt(model.get("parent_category_id"), 10));

      this.set("saving", true);
      model.set("parentCategory", parentCategory);

      model
        .save()
        .then(result => {
          this.set("saving", false);

          model.setProperties({
            slug: result.category.slug,
            id: result.category.id
          });

          if (this.get("selectedTab") !== "settings") {
            this.send("closeModal");
            DiscourseURL.redirectTo("/c/" + Discourse.Category.slugFor(model));
          }
        })
        .catch(error => {
          this.flash(extractError(error), "error");
          this.set("saving", false);
        });
    },

    deleteCategory() {
      const self = this;
      this.set("deleting", true);

      this.send("hideModal");
      bootbox.confirm(
        I18n.t("category.delete_confirm"),
        I18n.t("no_value"),
        I18n.t("yes_value"),
        function(result) {
          if (result) {
            self
              .get("model")
              .destroy()
              .then(
                function() {
                  // success
                  self.send("closeModal");
                  DiscourseURL.redirectTo("/categories");
                },
                function(error) {
                  self.flash(extractError(error), "error");
                  self.send("reopenModal");
                  self.displayErrors([I18n.t("category.delete_error")]);
                  self.set("deleting", false);
                }
              );
          } else {
            self.send("reopenModal");
            self.set("deleting", false);
          }
        }
      );
    },

    toggleDeleteTooltip() {
      this.toggleProperty("hiddenTooltip");
    }
  }
});
