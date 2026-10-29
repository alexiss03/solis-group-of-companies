-- Solis company CMS and merchant requests. Server-only private schema.
BEGIN;
CREATE SCHEMA solis;
REVOKE ALL ON SCHEMA solis FROM PUBLIC, anon, authenticated;
CREATE TABLE solis.commerce_companies (
	slug text PRIMARY KEY NOT NULL,
	name text NOT NULL,
	category text NOT NULL,
	description text NOT NULL,
	website text DEFAULT '' NOT NULL,
	logo text DEFAULT '' NOT NULL,
	accepting integer DEFAULT 1 NOT NULL,
	archived integer DEFAULT 0 NOT NULL,
	updated_at text NOT NULL
);

CREATE TABLE solis.commerce_events (
	id text PRIMARY KEY NOT NULL,
	order_id text NOT NULL,
	company_slug text NOT NULL,
	status text NOT NULL,
	public_note text DEFAULT '' NOT NULL,
	internal_note text DEFAULT '' NOT NULL,
	actor_email text DEFAULT '' NOT NULL,
	created_at text NOT NULL
);

CREATE INDEX commerce_events_order_idx ON solis.commerce_events (order_id,created_at);
CREATE TABLE solis.commerce_members (
	id text PRIMARY KEY NOT NULL,
	company_slug text NOT NULL,
	email text NOT NULL,
	active integer DEFAULT 1 NOT NULL,
	created_at text NOT NULL
);

CREATE UNIQUE INDEX commerce_member_unique ON solis.commerce_members (company_slug,email);
CREATE TABLE solis.commerce_orders (
	id text PRIMARY KEY NOT NULL,
	reference text NOT NULL,
	company_slug text NOT NULL,
	customer_name text NOT NULL,
	customer_email text NOT NULL,
	customer_phone text DEFAULT '' NOT NULL,
	type text NOT NULL,
	title text NOT NULL,
	details text NOT NULL,
	quantity integer,
	desired_date text,
	method text NOT NULL,
	location text DEFAULT '' NOT NULL,
	status text DEFAULT 'New' NOT NULL,
	tracking_hash text NOT NULL,
	request_key text NOT NULL,
	rate_key text NOT NULL,
	version integer DEFAULT 0 NOT NULL,
	last_event text,
	fulfillment_note text DEFAULT '' NOT NULL,
	fulfilled_at text,
	created_at text NOT NULL,
	updated_at text NOT NULL
);

CREATE UNIQUE INDEX commerce_orders_reference_unique ON solis.commerce_orders (reference);
CREATE INDEX commerce_orders_company_idx ON solis.commerce_orders (company_slug,created_at);
CREATE INDEX commerce_orders_rate_idx ON solis.commerce_orders (rate_key);
CREATE UNIQUE INDEX commerce_request_unique ON solis.commerce_orders (company_slug,request_key);
CREATE TABLE solis.cms_companies (
	id text PRIMARY KEY NOT NULL,
	owner text NOT NULL,
	name text NOT NULL,
	category text NOT NULL,
	website text DEFAULT '' NOT NULL,
	status text DEFAULT 'In development' NOT NULL,
	logo text DEFAULT '' NOT NULL,
	archived integer DEFAULT 0 NOT NULL,
	created_at text NOT NULL,
	updated_at text NOT NULL
);

CREATE INDEX cms_company_owner_idx ON solis.cms_companies (owner,archived);
CREATE TABLE solis.cms_movements (
	id text PRIMARY KEY NOT NULL,
	owner text NOT NULL,
	company_id text NOT NULL,
	item_id text NOT NULL,
	type text NOT NULL,
	delta double precision NOT NULL,
	before_quantity double precision NOT NULL,
	after_quantity double precision NOT NULL,
	note text NOT NULL,
	created_at text NOT NULL
);

CREATE INDEX cms_movement_owner_idx ON solis.cms_movements (owner,created_at);
CREATE TABLE solis.cms_records (
	id text PRIMARY KEY NOT NULL,
	owner text NOT NULL,
	company_id text NOT NULL,
	kind text NOT NULL,
	name text NOT NULL,
	status text DEFAULT 'Active' NOT NULL,
	data text DEFAULT '{}' NOT NULL,
	sku text,
	quantity double precision DEFAULT 0 NOT NULL,
	reorder_level double precision DEFAULT 0 NOT NULL,
	version integer DEFAULT 0 NOT NULL,
	last_movement text,
	archived integer DEFAULT 0 NOT NULL,
	created_at text NOT NULL,
	updated_at text NOT NULL
);

CREATE INDEX cms_record_owner_idx ON solis.cms_records (owner,kind,company_id,archived);
CREATE UNIQUE INDEX cms_sku_unique ON solis.cms_records (owner,company_id,kind,sku);
CREATE TABLE solis.cms_workspaces (
	owner text PRIMARY KEY NOT NULL,
	initialized_at text NOT NULL
);

ALTER TABLE solis.cms_companies ADD slug text;
CREATE UNIQUE INDEX cms_company_slug_unique ON solis.cms_companies (owner,slug);
ALTER TABLE solis.commerce_events ADD FOREIGN KEY (order_id) REFERENCES solis.commerce_orders(id) ON UPDATE no action ON DELETE no action;
ALTER TABLE solis.commerce_events ADD FOREIGN KEY (company_slug) REFERENCES solis.commerce_companies(slug) ON UPDATE no action ON DELETE no action;
ALTER TABLE solis.commerce_members ADD FOREIGN KEY (company_slug) REFERENCES solis.commerce_companies(slug) ON UPDATE no action ON DELETE no action;
ALTER TABLE solis.commerce_orders ADD FOREIGN KEY (company_slug) REFERENCES solis.commerce_companies(slug) ON UPDATE no action ON DELETE no action;
ALTER TABLE solis.cms_movements ADD FOREIGN KEY (company_id) REFERENCES solis.cms_companies(id) ON UPDATE no action ON DELETE no action;
ALTER TABLE solis.cms_movements ADD FOREIGN KEY (item_id) REFERENCES solis.cms_records(id) ON UPDATE no action ON DELETE no action;
ALTER TABLE solis.cms_records ADD FOREIGN KEY (company_id) REFERENCES solis.cms_companies(id) ON UPDATE no action ON DELETE no action;
ALTER TABLE solis.commerce_companies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE solis.commerce_companies FROM PUBLIC, anon, authenticated;
ALTER TABLE solis.commerce_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE solis.commerce_events FROM PUBLIC, anon, authenticated;
ALTER TABLE solis.commerce_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE solis.commerce_members FROM PUBLIC, anon, authenticated;
ALTER TABLE solis.commerce_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE solis.commerce_orders FROM PUBLIC, anon, authenticated;
ALTER TABLE solis.cms_companies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE solis.cms_companies FROM PUBLIC, anon, authenticated;
ALTER TABLE solis.cms_movements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE solis.cms_movements FROM PUBLIC, anon, authenticated;
ALTER TABLE solis.cms_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE solis.cms_records FROM PUBLIC, anon, authenticated;
ALTER TABLE solis.cms_workspaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE solis.cms_workspaces FROM PUBLIC, anon, authenticated;


CREATE INDEX commerce_events_company_idx ON solis.commerce_events(company_slug);
CREATE INDEX commerce_member_email_idx ON solis.commerce_members(email,active,company_slug);
CREATE INDEX cms_record_company_idx ON solis.cms_records(company_id);
CREATE INDEX cms_movement_company_idx ON solis.cms_movements(company_id);
CREATE INDEX cms_movement_item_idx ON solis.cms_movements(item_id);
ALTER TABLE solis.cms_records ADD CONSTRAINT cms_quantity_valid CHECK(quantity>=0 AND quantity<=1e9);
ALTER TABLE solis.commerce_orders ADD CONSTRAINT commerce_status_valid CHECK(status IN ('New','Confirmed','In progress','Ready','Fulfilled','Cancelled'));
CREATE TABLE solis.backend_credentials (
 scope text PRIMARY KEY CHECK(scope IN ('portal','cms')),
 key_hash text UNIQUE NOT NULL CHECK(length(key_hash)=64),
 owner_email text NOT NULL,
 origin text NOT NULL,
 active integer NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);
ALTER TABLE solis.backend_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE solis.backend_credentials FROM PUBLIC,anon,authenticated;
COMMIT;
