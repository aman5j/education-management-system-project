
import {
  FiPlus,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiMenu,
  FiChevronRight,
} from "react-icons/fi";

const createKey = (prefix = "menu") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export default function MenuControls({ menu, onChange }) {
  const items = Array.isArray(menu?.items) ? menu.items : [];

  const updateItems = (nextItems) => {
    onChange(nextItems);
  };

  const updateItem = (index, field, value) => {
    updateItems(
      items.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const addItem = () => {
    if (items.length >= 25) return;

    updateItems([
      ...items,
      {
        key: createKey(),
        label: "",
        url: "",
        isVisible: true,
        openInNewTab: false,
        children: [],
      },
    ]);
  };

  const removeItem = (index) => {
    updateItems(items.filter((_, itemIndex) => itemIndex !== index));
  };

  const moveItem = (index, direction) => {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= items.length) return;

    const nextItems = [...items];
    [nextItems[index], nextItems[nextIndex]] = [
      nextItems[nextIndex],
      nextItems[index],
    ];

    updateItems(nextItems);
  };

  const addChild = (index) => {
    const item = items[index];
    const children = item.children || [];

    if (children.length >= 15) return;

    updateItem(index, "children", [
      ...children,
      {
        key: createKey("submenu"),
        label: "",
        url: "",
        isVisible: true,
        openInNewTab: false,
      },
    ]);
  };

  const updateChild = (parentIndex, childIndex, field, value) => {
    const children = [...(items[parentIndex].children || [])];

    children[childIndex] = {
      ...children[childIndex],
      [field]: value,
    };

    updateItem(parentIndex, "children", children);
  };

  const removeChild = (parentIndex, childIndex) => {
    const children = (items[parentIndex].children || []).filter(
      (_, index) => index !== childIndex
    );

    updateItem(parentIndex, "children", children);
  };

  return (
    <div className="we-menu-controls">
      <div className="we-control-block">
        <div className="we-menu-heading">
          <div>
            <h4>Navigation Menu</h4>
            <p>Manage the links displayed in your website header.</p>
          </div>

          <span className="we-menu-count">
            {items.length}/25
          </span>
        </div>

        <div className="we-menu-info">
          <FiMenu />
          <span>
            Drag-free ordering: use the arrow controls to move menu
            items up or down.
          </span>
        </div>

        <button
          type="button"
          className="we-menu-add-button"
          onClick={addItem}
          disabled={items.length >= 25}
        >
          <FiPlus />
          Add Menu Item
        </button>
      </div>

      {items.length === 0 && (
        <div className="we-menu-empty">
          <FiMenu />
          <strong>No menu items yet</strong>
          <span>Add your first navigation item to get started.</span>
        </div>
      )}

      {items.map((item, index) => (
        <div className="we-menu-item-card" key={item.key}>
          <div className="we-menu-item-top">
            <div className="we-menu-item-number">
              {index + 1}
            </div>

            <strong>
              {item.label?.trim() || `Menu Item ${index + 1}`}
            </strong>

            <div className="we-menu-order-actions">
              <button
                type="button"
                title="Move up"
                aria-label="Move menu item up"
                disabled={index === 0}
                onClick={() => moveItem(index, -1)}
              >
                <FiChevronUp />
              </button>

              <button
                type="button"
                title="Move down"
                aria-label="Move menu item down"
                disabled={index === items.length - 1}
                onClick={() => moveItem(index, 1)}
              >
                <FiChevronDown />
              </button>

              <button
                type="button"
                className="danger"
                title="Delete menu item"
                aria-label="Delete menu item"
                onClick={() => removeItem(index)}
              >
                <FiTrash2 />
              </button>
            </div>
          </div>

          <label className="we-control-field">
            Menu Label
            <input
              type="text"
              value={item.label || ""}
              maxLength={40}
              placeholder="e.g. About Us"
              onChange={(event) =>
                updateItem(index, "label", event.target.value)
              }
            />
          </label>

          <label className="we-control-field">
            Menu URL
            <input
              type="text"
              value={item.url || ""}
              maxLength={500}
              placeholder="e.g. /about"
              onChange={(event) =>
                updateItem(index, "url", event.target.value)
              }
            />
          </label>

          <div className="we-menu-item-options">
            <label>
              <input
                type="checkbox"
                checked={item.isVisible !== false}
                onChange={(event) =>
                  updateItem(index, "isVisible", event.target.checked)
                }
              />
              <span>Visible</span>
            </label>

            <label>
              <input
                type="checkbox"
                checked={Boolean(item.openInNewTab)}
                onChange={(event) =>
                  updateItem(index, "openInNewTab", event.target.checked)
                }
              />
              <span>Open in new tab</span>
            </label>
          </div>

          <div className="we-submenu-section">
            <div className="we-submenu-heading">
              <div>
                <FiChevronRight />
                <strong>Dropdown Items</strong>
                <span>
                  {(item.children || []).length}/15
                </span>
              </div>

              <button
                type="button"
                onClick={() => addChild(index)}
                disabled={(item.children || []).length >= 15}
              >
                <FiPlus />
                Add Submenu
              </button>
            </div>

            {(item.children || []).map((child, childIndex) => (
              <div
                className="we-submenu-item"
                key={child.key}
              >
                <div className="we-submenu-item-heading">
                  <strong>
                    Submenu {childIndex + 1}
                  </strong>

                  <button
                    type="button"
                    title="Delete submenu"
                    aria-label="Delete submenu"
                    onClick={() => removeChild(index, childIndex)}
                  >
                    <FiTrash2 />
                  </button>
                </div>

                <label className="we-control-field">
                  Submenu Label
                  <input
                    type="text"
                    value={child.label || ""}
                    maxLength={40}
                    placeholder="e.g. Our Mission"
                    onChange={(event) =>
                      updateChild(
                        index,
                        childIndex,
                        "label",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="we-control-field">
                  Submenu URL
                  <input
                    type="text"
                    value={child.url || ""}
                    maxLength={500}
                    placeholder="e.g. /about/mission"
                    onChange={(event) =>
                      updateChild(
                        index,
                        childIndex,
                        "url",
                        event.target.value
                      )
                    }
                  />
                </label>

                <div className="we-menu-item-options">
                  <label>
                    <input
                      type="checkbox"
                      checked={child.isVisible !== false}
                      onChange={(event) =>
                        updateChild(
                          index,
                          childIndex,
                          "isVisible",
                          event.target.checked
                        )
                      }
                    />
                    <span>Visible</span>
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(child.openInNewTab)}
                      onChange={(event) =>
                        updateChild(
                          index,
                          childIndex,
                          "openInNewTab",
                          event.target.checked
                        )
                      }
                    />
                    <span>Open in new tab</span>
                  </label>
                </div>
              </div>
            ))}

            {(item.children || []).length === 0 && (
              <p className="we-submenu-empty">
                No dropdown items. Add a submenu if required.
              </p>
            )}
          </div>
        </div>
      ))}

      <div className="we-menu-footer-note">
        Maximum 25 main menu items and 15 submenu items per menu.
        Changes are saved using the Website Editor's Save Draft button.
      </div>
    </div>
  );
}
