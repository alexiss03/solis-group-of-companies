CREATE TABLE solis.commerce_offerings (
	id text PRIMARY KEY NOT NULL,
	company_slug text NOT NULL,
	name text NOT NULL,
	description text DEFAULT '' NOT NULL,
	kind text NOT NULL,
	pricing text NOT NULL,
	price_minor bigint,
	currency text NOT NULL,
	unit text NOT NULL,
	lead_min integer NOT NULL,
	lead_max integer NOT NULL,
	lead_unit text NOT NULL,
	active integer DEFAULT 1 NOT NULL,
	version integer DEFAULT 0 NOT NULL,
	created_at text NOT NULL,
	updated_at text NOT NULL,
	FOREIGN KEY (company_slug) REFERENCES solis.commerce_companies(slug) ON UPDATE no action ON DELETE no action
);

CREATE INDEX commerce_offerings_company_idx ON solis.commerce_offerings (company_slug,active);
CREATE TABLE solis.commerce_profiles (
	company_slug text PRIMARY KEY NOT NULL,
	location text NOT NULL,
	delivery_scope text NOT NULL,
	delivery_areas text DEFAULT '' NOT NULL,
	delivery_notes text DEFAULT '' NOT NULL,
	methods text NOT NULL,
	version integer DEFAULT 0 NOT NULL,
	updated_at text NOT NULL,
	FOREIGN KEY (company_slug) REFERENCES solis.commerce_companies(slug) ON UPDATE no action ON DELETE no action
);

ALTER TABLE solis.commerce_orders ADD offering_id text REFERENCES solis.commerce_offerings(id);
ALTER TABLE solis.commerce_orders ADD offering_snapshot text DEFAULT '{}' NOT NULL;
CREATE INDEX commerce_orders_offering_idx ON solis.commerce_orders(offering_id);
ALTER TABLE solis.commerce_offerings ADD CONSTRAINT offering_price_valid CHECK ((pricing='Quote' AND price_minor IS NULL) OR (pricing IN ('Fixed','From') AND price_minor IS NOT NULL AND price_minor BETWEEN 0 AND 10000000000));
ALTER TABLE solis.commerce_offerings ADD CONSTRAINT offering_lead_valid CHECK(lead_min>=0 AND lead_max>=lead_min AND lead_max<=3650 AND lead_unit IN ('Hours','Days','Weeks'));
ALTER TABLE solis.commerce_offerings ADD CONSTRAINT offering_kind_valid CHECK(kind IN ('Product','Service'));
ALTER TABLE solis.commerce_offerings ADD CONSTRAINT offering_active_valid CHECK(active IN (0,1));
ALTER TABLE solis.commerce_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE solis.commerce_offerings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE solis.commerce_profiles,solis.commerce_offerings FROM PUBLIC,anon,authenticated;
CREATE POLICY server_access_only ON solis.commerce_profiles FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY server_access_only ON solis.commerce_offerings FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
