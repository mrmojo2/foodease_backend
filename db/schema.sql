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



