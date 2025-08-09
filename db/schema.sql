CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL, -- stored as bcrypt hash
    user_type ENUM('admin', 'costumer') NOT NULL,
    role ENUM('costumer', 'admin', 'owner') DEFAULT 'admin',
    pfp_url VARCHAR(512) DEFAULT 'https://res.cloudinary.com/ducxipxkt/image/upload/v1727721201/rent_app/profile_pics/default_profile_400x400_zkc1hd.png',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE (username)
);

CREATE TABLE categories (
    _id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INT DEFAULT 0,
    thumbnail_url VARCHAR(512) DEFAULT 'https://res.cloudinary.com/ducxipxkt/image/upload/c_thumb,w_200,g_face/v1738131384/digital_menu/Categories/default.jpg',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE menu_items (
    _id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category_id INT NOT NULL,
    image_url VARCHAR(512) DEFAULT 'https://res.cloudinary.com/ducxipxkt/image/upload/v1741362559/digital_menu/MenuItems/default_nddayf.jpg',
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES categories(_id) ON DELETE CASCADE
);

CREATE TABLE menu_item_customization_groups (
    _id INT AUTO_INCREMENT PRIMARY KEY,
    menu_item_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,

    FOREIGN KEY (menu_item_id) REFERENCES menu_items(_id) ON DELETE CASCADE
);

CREATE TABLE menu_item_customization_options (
    _id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    price_addition DECIMAL(10,2) DEFAULT 0.00,

    FOREIGN KEY (group_id) REFERENCES menu_item_customization_groups(_id) ON DELETE CASCADE
);


CREATE TABLE orders (
    _id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(100) NOT NULL UNIQUE,
    table_id INT NOT NULL,
    status ENUM('pending', 'preparing', 'served', 'complete', 'cancelled') DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status ENUM('pending', 'paid') DEFAULT 'pending',
    payment_method ENUM('cash', 'online_payment') DEFAULT 'cash',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (table_id) REFERENCES tables(_id)
);

CREATE TABLE order_items (
    _id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity >= 1),
    price DECIMAL(10,2) NOT NULL,
    notes TEXT,

    FOREIGN KEY (order_id) REFERENCES orders(_id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(_id)
);

CREATE TABLE order_item_customizations (
    _id INT AUTO_INCREMENT PRIMARY KEY,
    order_item_id INT NOT NULL,
    option_name VARCHAR(100),
    selection VARCHAR(100),
    price_addition DECIMAL(10,2),

    FOREIGN KEY (order_item_id) REFERENCES order_items(_id) ON DELETE CASCADE
);

CREATE TABLE tables (
  _id INT AUTO_INCREMENT PRIMARY KEY,
  table_number VARCHAR(50) NOT NULL UNIQUE,
  capacity INT NOT NULL CHECK (capacity > 0),
  status ENUM('available','occupied','reserved','maintenance') DEFAULT 'available',
  current_order_id INT NULL, -- will reference orders(_id) after orders is created
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ALTER TABLE tables
--   ADD CONSTRAINT fk_tables_current_order
--   FOREIGN KEY (current_order_id) REFERENCES orders(_id)
--   ON DELETE SET NULL;




