def _make_product(client, headers, serial, **overrides):
    payload = {
        "serial_number": serial,
        "brand": "Dell",
        "model_no": "OptiPlex",
        "category": "Desktops",
        "price": 500,
    }
    payload.update(overrides)
    resp = client.post("/products", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_create_unit_attached_to_existing_unit(client, make_admin):
    headers = make_admin("attach1@example.com")
    desktop = _make_product(client, headers, "DESK-ATTACH-1")

    resp = client.post(
        "/products",
        json={
            "serial_number": "MOUSE-ATTACH-1",
            "brand": "Logitech",
            "category": "Peripherals",
            "attached_to_id": desktop["id"],
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["attached_to_id"] == desktop["id"]


def test_attach_to_nonexistent_product_rejected(client, make_admin):
    headers = make_admin("attach2@example.com")
    resp = client.post(
        "/products",
        json={
            "serial_number": "MOUSE-ATTACH-BAD",
            "brand": "Logitech",
            "attached_to_id": 999999,
        },
        headers=headers,
    )
    assert resp.status_code == 400
    assert "does not match" in resp.json()["detail"]


def test_cannot_attach_to_self_via_update(client, make_admin):
    headers = make_admin("attach3@example.com")
    product = _make_product(client, headers, "SELF-ATTACH-1")
    resp = client.patch(
        f"/products/{product['id']}",
        json={"attached_to_id": product["id"]},
        headers=headers,
    )
    assert resp.status_code == 400
    assert "itself" in resp.json()["detail"]


def test_cannot_chain_attachments(client, make_admin):
    headers = make_admin("attach4@example.com")
    desktop = _make_product(client, headers, "DESK-CHAIN-1")
    mouse = _make_product(
        client, headers, "MOUSE-CHAIN-1", brand="Logitech", attached_to_id=desktop["id"]
    )
    # A keyboard trying to attach to the mouse (itself an accessory) must fail.
    resp = client.post(
        "/products",
        json={
            "serial_number": "KEYBOARD-CHAIN-1",
            "brand": "Logitech",
            "attached_to_id": mouse["id"],
        },
        headers=headers,
    )
    assert resp.status_code == 400
    assert "itself attached" in resp.json()["detail"]


def test_deleting_parent_orphans_accessory_instead_of_cascading(client, make_admin):
    headers = make_admin("attach5@example.com")
    desktop = _make_product(client, headers, "DESK-ORPHAN-1")
    mouse = _make_product(
        client, headers, "MOUSE-ORPHAN-1", brand="Logitech", attached_to_id=desktop["id"]
    )

    resp = client.delete(f"/products/{desktop['id']}", headers=headers)
    assert resp.status_code == 204

    resp = client.get(f"/products/{mouse['id']}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["attached_to_id"] is None


def test_clearing_attachment_via_update(client, make_admin):
    headers = make_admin("attach6@example.com")
    desktop = _make_product(client, headers, "DESK-CLEAR-1")
    mouse = _make_product(
        client, headers, "MOUSE-CLEAR-1", brand="Logitech", attached_to_id=desktop["id"]
    )

    resp = client.patch(
        f"/products/{mouse['id']}",
        json={"attached_to_id": None},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["attached_to_id"] is None
