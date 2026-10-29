-- Direct client access is denied. Only the authenticated server handlers access these tables.
CREATE POLICY server_access_only ON solis.commerce_companies FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY server_access_only ON solis.commerce_orders FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY server_access_only ON solis.commerce_events FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY server_access_only ON solis.commerce_members FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY server_access_only ON solis.cms_companies FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY server_access_only ON solis.cms_records FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY server_access_only ON solis.cms_movements FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY server_access_only ON solis.cms_workspaces FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY server_access_only ON solis.backend_credentials FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
