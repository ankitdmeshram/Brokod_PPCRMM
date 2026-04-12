/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasUsersTable = await knex.schema.hasTable("users");

  if (!hasUsersTable) {
    await knex.schema.createTable("users", (table) => {
      table.increments("id").primary();
      table.string("first_name", 100).notNullable();
      table.string("last_name", 100).notNullable();
      table.string("email", 255).notNullable();
      table.string("phone", 20).notNullable();
      table.string("password", 255).notNullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table
        .timestamp("updated_at")
        .notNullable()
        .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
      table.timestamp("last_login").nullable().defaultTo(null);
      table.boolean("is_active").notNullable().defaultTo(true);
      table.string("role", 50).notNullable().defaultTo("user");
      table.unique(["email"], "users_email_unique");
    });

    return;
  }

  const hasName = await knex.schema.hasColumn("users", "name");
  const hasFirstName = await knex.schema.hasColumn("users", "first_name");
  const hasLastName = await knex.schema.hasColumn("users", "last_name");
  const hasPhone = await knex.schema.hasColumn("users", "phone");
  const hasPasswordHash = await knex.schema.hasColumn("users", "password_hash");
  const hasPassword = await knex.schema.hasColumn("users", "password");
  const hasCreatedAt = await knex.schema.hasColumn("users", "created_at");
  const hasUpdatedAt = await knex.schema.hasColumn("users", "updated_at");
  const hasLastLogin = await knex.schema.hasColumn("users", "last_login");
  const hasIsActive = await knex.schema.hasColumn("users", "is_active");
  const hasRole = await knex.schema.hasColumn("users", "role");

  if (!hasFirstName) {
    await knex.schema.alterTable("users", (table) => {
      table.string("first_name", 100).nullable();
    });
  }

  if (!hasLastName) {
    await knex.schema.alterTable("users", (table) => {
      table.string("last_name", 100).nullable();
    });
  }

  if (hasName) {
    await knex.raw(`
      UPDATE users
      SET first_name = COALESCE(NULLIF(TRIM(SUBSTRING_INDEX(name, ' ', 1)), ''), first_name, '')
      WHERE first_name IS NULL OR first_name = ''
    `);

    await knex.raw(`
      UPDATE users
      SET last_name = COALESCE(
        NULLIF(TRIM(SUBSTRING(name, LENGTH(SUBSTRING_INDEX(name, ' ', 1)) + 1)), ''),
        last_name,
        ''
      )
      WHERE last_name IS NULL OR last_name = ''
    `);
  }

  await knex.raw("UPDATE users SET first_name = '' WHERE first_name IS NULL");
  await knex.raw("UPDATE users SET last_name = '' WHERE last_name IS NULL");

  if (!hasPhone) {
    await knex.schema.alterTable("users", (table) => {
      table.string("phone", 20).nullable();
    });
    await knex.raw("UPDATE users SET phone = '' WHERE phone IS NULL");
  }

  if (hasPasswordHash && !hasPassword) {
    await knex.schema.renameColumn("users", "password_hash", "password");
  } else if (!hasPassword) {
    await knex.schema.alterTable("users", (table) => {
      table.string("password", 255).nullable();
    });
    await knex.raw("UPDATE users SET password = '' WHERE password IS NULL");
  }

  if (!hasCreatedAt) {
    await knex.schema.alterTable("users", (table) => {
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    });
  }

  if (!hasUpdatedAt) {
    await knex.schema.alterTable("users", (table) => {
      table.timestamp("updated_at").nullable().defaultTo(knex.fn.now());
    });
  }

  if (!hasLastLogin) {
    await knex.schema.alterTable("users", (table) => {
      table.timestamp("last_login").nullable().defaultTo(null);
    });
  }

  if (!hasIsActive) {
    await knex.schema.alterTable("users", (table) => {
      table.boolean("is_active").notNullable().defaultTo(true);
    });
  }

  if (!hasRole) {
    await knex.schema.alterTable("users", (table) => {
      table.string("role", 50).notNullable().defaultTo("user");
    });
  }

  await knex.raw("UPDATE users SET phone = '' WHERE phone IS NULL");
  await knex.raw("UPDATE users SET password = '' WHERE password IS NULL");
  await knex.raw("UPDATE users SET is_active = TRUE WHERE is_active IS NULL");
  await knex.raw("UPDATE users SET role = 'user' WHERE role IS NULL OR role = ''");

  await knex.raw("ALTER TABLE users MODIFY first_name VARCHAR(100) NOT NULL");
  await knex.raw("ALTER TABLE users MODIFY last_name VARCHAR(100) NOT NULL");
  await knex.raw("ALTER TABLE users MODIFY phone VARCHAR(20) NOT NULL");
  await knex.raw("ALTER TABLE users MODIFY password VARCHAR(255) NOT NULL");
  await knex.raw("ALTER TABLE users MODIFY email VARCHAR(255) NOT NULL");
  await knex.raw(
    "ALTER TABLE users MODIFY created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"
  );
  await knex.raw(
    "ALTER TABLE users MODIFY updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
  );
  await knex.raw("ALTER TABLE users MODIFY last_login TIMESTAMP NULL DEFAULT NULL");
  await knex.raw("ALTER TABLE users MODIFY is_active BOOLEAN NOT NULL DEFAULT TRUE");
  await knex.raw("ALTER TABLE users MODIFY role VARCHAR(50) NOT NULL DEFAULT 'user'");

  if (hasName) {
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("name");
    });
  }

  const hasEmailUniqueIndex = await knex.raw("SHOW INDEX FROM users WHERE Key_name = 'users_email_unique'");
  if (hasEmailUniqueIndex[0].length === 0) {
    await knex.schema.alterTable("users", (table) => {
      table.unique(["email"], "users_email_unique");
    });
  }
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("users");
};
