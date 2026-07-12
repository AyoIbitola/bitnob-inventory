def _make_product(client, headers, serial, category):
    resp = client.post(
        "/products",
        json={"serial_number": serial, "brand": "Dell", "category": category, "price": 100},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_create_empty_category_with_description(client, make_admin):
    headers = make_admin("cat1@example.com")
    resp = client.post(
        "/categories",
        json={"name": "Monitors", "description": "Display hardware"},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body == {
        "name": "Monitors",
        "units": 0,
        "total_value": 0.0,
        "description": "Display hardware",
        "image_url": None,
    }


def test_duplicate_category_name_rejected(client, make_admin):
    headers = make_admin("cat2@example.com")
    client.post("/categories", json={"name": "Cables"}, headers=headers)
    resp = client.post("/categories", json={"name": "cables"}, headers=headers)
    assert resp.status_code == 400


def test_creating_category_that_already_has_products_is_rejected(client, make_admin):
    """POST is for brand-new names only — adding metadata to a category that
    already has products under it goes through PATCH instead (tested below)."""
    headers = make_admin("cat3@example.com")
    _make_product(client, headers, "MON-1", "Displays")
    resp = client.post("/categories", json={"name": "Displays"}, headers=headers)
    assert resp.status_code == 400


def test_list_merges_product_derived_and_metadata_only_categories(client, make_admin):
    headers = make_admin("cat4@example.com")
    _make_product(client, headers, "MON-2", "Displays4")
    client.patch("/categories/Displays4", json={"description": "Screens"}, headers=headers)
    client.post("/categories", json={"name": "Empty Cat"}, headers=headers)

    resp = client.get("/categories", headers=headers)
    assert resp.status_code == 200
    by_name = {c["name"]: c for c in resp.json()}
    assert by_name["Displays4"]["units"] == 1
    assert by_name["Displays4"]["description"] == "Screens"
    assert by_name["Empty Cat"]["units"] == 0


def test_rename_updates_products_and_metadata(client, make_admin):
    headers = make_admin("cat5@example.com")
    _make_product(client, headers, "KB-1", "Keyboards")
    resp = client.patch("/categories/Keyboards", json={"new_name": "Input Devices"}, headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["name"] == "Input Devices"
    assert resp.json()["units"] == 1

    products = client.get("/products", params={"category": "Input Devices"}, headers=headers)
    assert len(products.json()) == 1


def test_update_description_without_renaming(client, make_admin):
    headers = make_admin("cat6@example.com")
    _make_product(client, headers, "MSE-1", "Mice")
    resp = client.patch("/categories/Mice", json={"description": "Pointing devices"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Mice"
    assert resp.json()["description"] == "Pointing devices"


def test_delete_clears_products_and_removes_metadata_row(client, make_admin):
    headers = make_admin("cat7@example.com")
    _make_product(client, headers, "DOCK-1", "Docks")
    client.patch("/categories/Docks", json={"description": "Docking stations"}, headers=headers)

    resp = client.delete("/categories/Docks", headers=headers)
    assert resp.status_code == 204

    product = client.get("/products", params={"q": "DOCK-1"}, headers=headers).json()[0]
    assert product["category"] is None

    # Re-creating the same name should work — nothing left over.
    resp = client.post("/categories", json={"name": "Docks"}, headers=headers)
    assert resp.status_code == 201


def test_delete_nonexistent_category_404s(client, make_admin):
    headers = make_admin("cat8@example.com")
    resp = client.delete("/categories/NoSuchCategory", headers=headers)
    assert resp.status_code == 404


def test_non_admin_cannot_create_category(client):
    client.post(
        "/auth/register",
        json={"email": "catstaff@example.com", "password": "password123"},
    )
    login = client.post(
        "/auth/login",
        json={"email": "catstaff@example.com", "password": "password123"},
    )
    staff_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    resp = client.post("/categories", json={"name": "Staff Attempt"}, headers=staff_headers)
    assert resp.status_code == 403
