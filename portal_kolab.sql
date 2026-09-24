-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Sep 24, 2026 at 02:33 AM
-- Server version: 8.4.11
-- PHP Version: 8.5.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `portal_kolab`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `username` varchar(50) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `avatar` text,
  `photo_id` text,
  `password` varchar(255) NOT NULL,
  `youtube` text,
  `spotify` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`username`, `name`, `email`, `avatar`, `photo_id`, `password`, `youtube`, `spotify`, `created_at`) VALUES
('hrkolab', 'HR Kolab', 'hr.kolab@gmail.com', 'http://localhost:3001/api/files/67cd8244-94e2-4c37-9797-0f62e10688ee', 'http://localhost:3001/api/files/9283f653-31ca-4367-ac84-f58d75d95617', '37f972df8b2a01fa073f2416275161c01340203fda92f0c7ebc485175f396d19', 'https://youtube.com/playlist?list=PLZS-MHyEIRo6rAu3mYVNs2_y-fbJaOH5R&si=JYdVy3KE0LPqp5X9', 'https://open.spotify.com/playlist/5lEI5n2AhNOUmdV7cadt3P?si=facad6949828413b', '2026-09-20 07:22:12');

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

CREATE TABLE `announcements` (
  `id` varchar(50) NOT NULL,
  `author` varchar(100) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `content` text,
  `created_at` datetime DEFAULT NULL,
  `target_type` varchar(50) DEFAULT NULL,
  `target_value` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `announcements`
--

INSERT INTO `announcements` (`id`, `author`, `title`, `content`, `created_at`, `target_type`, `target_value`) VALUES
('item-9407af88-6766-4bbd-990e-5507a896b054', 'HR Kolab', 'Undangan Townhall Bulanan & Sesi Networking', 'Halo semua! Jangan lewatkan sesi Townhall bulanan kita yang akan diadakan pada Jumat minggu ini di Main Hall, mulai pukul 15.00 WIB. Kita akan membahas berbagai update terbaru terkait program kolaborasi bulan depan, dilanjutkan dengan sesi networking santai. Sampai jumpa di sana!', '2026-09-24 05:44:06', 'ALL', ''),
('item-b5efa07a-edbb-4cf7-89aa-f791cacd5e62', 'HR Kolab', 'Info Pemeliharaan Sistem Portal Kolab', 'Pemberitahuan kepada seluruh pengguna dengan hak akses Admin dan Manajer: Kami akan melakukan pemeliharaan sistem (maintenance) pada server Portal Kolab pada akhir pekan ini, Sabtu dini hari pukul 01.00 - 04.00 WIB. Beberapa fitur mungkin akan mengalami kendala akses selama periode tersebut. Terima kasih atas pengertiannya.', '2026-09-24 05:50:35', 'ROLE', 'LECTURER'),
('item-d9ca12df-7ac5-45aa-aab5-b064beb33ccf', 'HR Kolab', 'Pengingat: Batas Waktu Pengumpulan Laporan Q3', 'Perhatian untuk seluruh perwakilan Startup! Mengingatkan kembali bahwa batas akhir pengumpulan dokumen dan laporan progres Kuartal 3 (Q3) adalah akhir minggu ini. Mohon segera unggah dokumen Anda melalui menu \"Mainframe Repo\". Hubungi tim Admin/HR jika ada kendala sistem.', '2026-09-24 05:44:54', 'STARTUP', 'item-38f6122c-5c51-47ea-998c-39be69c4c7ed');

-- --------------------------------------------------------

--
-- Table structure for table `articles`
--

CREATE TABLE `articles` (
  `id` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` longtext,
  `date` datetime DEFAULT NULL,
  `author` varchar(100) DEFAULT NULL,
  `tags` text,
  `category_id` varchar(50) DEFAULT NULL,
  `image_url` text,
  `video_url` text,
  `other_url` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `articles`
--

INSERT INTO `articles` (`id`, `title`, `content`, `date`, `author`, `tags`, `category_id`, `image_url`, `video_url`, `other_url`) VALUES
('art-05c6a7a7-55df-4b10-a028-5248418a0a19', 'Implementasi IoT pada Smart Farming untuk Otomatisasi Jadwal Penyiraman', '<h2> Pengelolaan lahan</h2><div> pertanian modern kini semakin efisien dengan adopsi <i>Smart Farming</i> berbasis <i>Internet of Things</i> (IoT). Artikel ini membahas perancangan sistem otomatisasi jadwal penyiraman tanaman yang dikendalikan langsung oleh data dari sensor kelembapan tanah. Dengan mengintegrasikan mikrokontroler ke <i>dashboard</i> pemantauan berbasis web—seperti menggunakan <i>framework</i> Laravel—pengguna dapat melacak status hidrasi area budidaya secara <i>real-time</i>. Penerapan teknologi ini sangat optimal untuk manajemen perawatan tanaman yang membutuhkan presisi tinggi seperti budidaya sorgum, memastikan penggunaan air lebih hemat sekaligus menghasilkan pencatatan data panen yang terukur.  </div>', '2026-09-23 16:30:00', 'HR Kolab', '[\"item-cee063bc-b810-42fc-adba-3f3fc3e4b01c\",\"item-c02bdaa5-300d-4877-87e6-fa7f74e66936\"]', 'item-ad5adf36-ec99-44d0-9cb9-0e95c5d4420f', 'https://api-cdn.kroombox.com/api/bridge/view/a2e21b55030577f9', '', ''),
('art-1790150939809', 'Implementasi Alur Kerja AI dalam Pengembangan Web Laravel', '<h3><span style=\"font-weight: normal;\">Memasuki pasar <i data-path-to-node=\"5,4,0\" data-index-in-node=\"28\">freelance</i> global seperti Fiverr membutuhkan lebih dari sekadar kemampuan <i data-path-to-node=\"5,4,0\" data-index-in-node=\"101\">coding</i>. Artikel ini mengulas strategi pemasaran layanan pembuatan aplikasi web dan <i data-path-to-node=\"5,4,0\" data-index-in-node=\"184\">mobile</i> (seperti Flutter). Fokus utamanya meliputi cara menyusun struktur paket harga (<i data-path-to-node=\"5,4,0\" data-index-in-node=\"270\">pricing model</i>), mendesain tata letak galeri gambar aplikasi yang menarik secara visual, serta merancang deskripsi layanan yang memenuhi standar verifikasi <i data-path-to-node=\"5,4,0\" data-index-in-node=\"425\">marketplace</i>. Strategi ini dirancang untuk meningkatkan visibilitas profil dan rasio konversi klien internasional.&nbsp;</span></h3>', '2026-09-23 00:00:00', 'HR Kolab', '[\"item-cee063bc-b810-42fc-adba-3f3fc3e4b01c\"]', 'item-ad5adf36-ec99-44d0-9cb9-0e95c5d4420f', 'https://api-cdn.kroombox.com/api/bridge/view/35702da3893c5073', '', ''),
('art-8a3dcd0c-3e93-4111-8487-918b0f3ffd6a', 'Strategi Optimasi Portofolio Freelance Web App di Platform Global', 'Memasuki pasar <i data-path-to-node=\"5,4,0\" data-index-in-node=\"28\">freelance</i> global seperti Fiverr membutuhkan lebih dari sekadar kemampuan <i data-path-to-node=\"5,4,0\" data-index-in-node=\"101\">coding</i>. Artikel ini mengulas strategi pemasaran layanan pembuatan aplikasi web dan <i data-path-to-node=\"5,4,0\" data-index-in-node=\"184\">mobile</i> (seperti Flutter). Fokus utamanya meliputi cara menyusun struktur paket harga (<i data-path-to-node=\"5,4,0\" data-index-in-node=\"270\">pricing model</i>), mendesain tata letak galeri gambar aplikasi yang menarik secara visual, serta merancang deskripsi layanan yang memenuhi standar verifikasi <i data-path-to-node=\"5,4,0\" data-index-in-node=\"425\">marketplace</i>. Strategi ini dirancang untuk meningkatkan visibilitas profil dan rasio konversi klien internasional.', '2026-09-23 00:00:00', 'HR Kolab', '[\"item-a0245c42-63c2-46a5-a103-72fa34e66832\",\"item-7bd92700-b46c-4b6e-9466-4aa66ddb2746\"]', 'item-9d0e40b5-bd45-4106-b25f-433209e067df', 'https://api-cdn.kroombox.com/api/bridge/view/8d215700479aaa8e', '', '');

-- --------------------------------------------------------

--
-- Table structure for table `article_attachments`
--

CREATE TABLE `article_attachments` (
  `id` varchar(50) NOT NULL,
  `article_id` varchar(50) NOT NULL,
  `file_id` varchar(100) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `size` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `cdn_asset_id` varchar(50) DEFAULT NULL,
  `storage_provider` varchar(30) DEFAULT 'LEGACY'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `article_attachments`
--

INSERT INTO `article_attachments` (`id`, `article_id`, `file_id`, `original_name`, `mime_type`, `size`, `created_at`, `cdn_asset_id`, `storage_provider`) VALUES
('13b6b3d2-c846-434f-8835-495b6b2c7355', 'art-1790150939809', 'f13b038d-d9f5-4301-945d-af07c89ee138', '01_Sequence_Diagram_Integrasi_API_AI.pdf', 'application/pdf', 3946, '2026-09-23 08:24:33', 'f13b038d-d9f5-4301-945d-af07c89ee138', 'KROOMBOX_CDN'),
('693df215-d096-4977-9846-71fc56afd5e8', 'art-8a3dcd0c-3e93-4111-8487-918b0f3ffd6a', '59727d30-1882-46ce-99de-7b947b9b63aa', '01_Template_Struktur_Harga_Basic_Standard_Premium.pdf', 'application/pdf', 51436, '2026-09-23 08:28:59', '59727d30-1882-46ce-99de-7b947b9b63aa', 'KROOMBOX_CDN'),
('90c1bae3-da0d-4633-9cd9-7c66707e3a80', 'art-8a3dcd0c-3e93-4111-8487-918b0f3ffd6a', '8d1059fe-c193-4921-a401-6c3201394762', '03_Template_Freelance_Offer_Readiness.pdf', 'application/pdf', 49083, '2026-09-23 08:28:59', '8d1059fe-c193-4921-a401-6c3201394762', 'KROOMBOX_CDN'),
('a17f26fb-45da-41f4-adbc-40c924c1404b', 'art-1790150939809', '3c933701-aba1-419f-9d95-4ff1c5b35683', '02_Class_Diagram_Arsitektur_Integrasi_API.pdf', 'application/pdf', 4719, '2026-09-23 08:24:33', '3c933701-aba1-419f-9d95-4ff1c5b35683', 'KROOMBOX_CDN'),
('e1a68e22-41da-49c9-8952-91493f9595e0', 'art-8a3dcd0c-3e93-4111-8487-918b0f3ffd6a', 'b78ca3f8-037d-460e-a5f5-796f5c4c39fe', '02_Checklist_Materi_Promosi_Freelance.pdf', 'application/pdf', 51123, '2026-09-23 08:28:59', 'b78ca3f8-037d-460e-a5f5-796f5c4c39fe', 'KROOMBOX_CDN');

-- --------------------------------------------------------

--
-- Table structure for table `article_categories`
--

CREATE TABLE `article_categories` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) DEFAULT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `article_categories`
--

INSERT INTO `article_categories` (`id`, `name`, `slug`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
('item-8b173c52-bac0-4036-92a7-58bcbfb0dc5f', 'Technology & Development', NULL, NULL, 1, '2026-09-24 01:36:27', '2026-09-24 01:36:27'),
('item-9d0e40b5-bd45-4106-b25f-433209e067df', 'Marketing', NULL, NULL, 1, '2026-09-22 04:02:49', '2026-09-22 04:02:49'),
('item-aa8537f8-8bf8-42e2-b594-08272745b070', 'Design & Creative', NULL, NULL, 1, '2026-09-24 01:36:46', '2026-09-24 01:36:46'),
('item-ad5adf36-ec99-44d0-9cb9-0e95c5d4420f', 'Artifical Intelligence', NULL, NULL, 1, '2026-09-22 02:48:18', '2026-09-22 02:48:18'),
('item-bac84111-18c1-48bf-a52d-052ef4558946', 'News & Announcements', NULL, NULL, 1, '2026-09-24 01:37:02', '2026-09-24 01:37:02'),
('item-e6a33a6a-df45-4333-898b-c4a3ca58a34c', 'Productivity & Management', NULL, NULL, 1, '2026-09-24 01:36:54', '2026-09-24 01:36:54'),
('item-e9616635-aede-4b45-91cb-096a10ac17fc', 'Business & Strategy', NULL, NULL, 1, '2026-09-24 01:36:39', '2026-09-24 01:36:39');

-- --------------------------------------------------------

--
-- Table structure for table `article_tags`
--

CREATE TABLE `article_tags` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `article_tags`
--

INSERT INTO `article_tags` (`id`, `name`, `slug`, `is_active`, `created_at`, `updated_at`) VALUES
('item-121122c3-3c1a-4a82-ae50-5fe81d7950ef', 'Web Development', 'web-development', 1, '2026-09-24 01:37:26', '2026-09-24 01:37:26'),
('item-56aa7854-cd97-4f20-a3b5-075601d99285', 'Generative AI', 'generative-ai', 1, '2026-09-24 01:37:33', '2026-09-24 01:37:33'),
('item-7bd92700-b46c-4b6e-9466-4aa66ddb2746', 'Web App', 'web-app', 1, '2026-09-23 08:27:06', '2026-09-23 08:27:06'),
('item-822bdf60-e34c-4734-b4d7-8c7c3275920d', 'Machine Learning', 'machine-learning', 1, '2026-09-24 01:37:16', '2026-09-24 01:37:16'),
('item-a0245c42-63c2-46a5-a103-72fa34e66832', 'Freelance', 'freelance', 1, '2026-09-23 08:26:53', '2026-09-23 08:26:53'),
('item-acd1c7d2-7f56-40cc-84c8-a3c950db21b9', 'Mobile Apps', 'mobile-apps', 1, '2026-09-24 01:37:40', '2026-09-24 01:37:40'),
('item-c02bdaa5-300d-4877-87e6-fa7f74e66936', 'MCP', 'mcp', 1, '2026-09-22 04:02:34', '2026-09-22 04:02:34'),
('item-c168df72-ee87-4948-a17a-f430bc9845b8', 'Portofolio', 'portofolio', 1, '2026-09-23 08:27:00', '2026-09-23 08:27:00'),
('item-cee063bc-b810-42fc-adba-3f3fc3e4b01c', 'collaboration', 'collaboration', 1, '2026-09-22 04:03:21', '2026-09-22 04:03:21'),
('item-e1fde971-4765-4c21-85c1-8098a570bce7', 'B2B', 'b2b', 1, '2026-09-24 01:37:49', '2026-09-24 01:37:49');

-- --------------------------------------------------------

--
-- Table structure for table `article_tag_map`
--

CREATE TABLE `article_tag_map` (
  `article_id` varchar(50) NOT NULL,
  `tag_id` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `article_tag_map`
--

INSERT INTO `article_tag_map` (`article_id`, `tag_id`, `created_at`) VALUES
('art-05c6a7a7-55df-4b10-a028-5248418a0a19', 'item-c02bdaa5-300d-4877-87e6-fa7f74e66936', '2026-09-23 09:32:25'),
('art-05c6a7a7-55df-4b10-a028-5248418a0a19', 'item-cee063bc-b810-42fc-adba-3f3fc3e4b01c', '2026-09-23 09:32:25'),
('art-1790150939809', 'item-cee063bc-b810-42fc-adba-3f3fc3e4b01c', '2026-09-23 08:24:33'),
('art-8a3dcd0c-3e93-4111-8487-918b0f3ffd6a', 'item-7bd92700-b46c-4b6e-9466-4aa66ddb2746', '2026-09-23 08:28:59'),
('art-8a3dcd0c-3e93-4111-8487-918b0f3ffd6a', 'item-a0245c42-63c2-46a5-a103-72fa34e66832', '2026-09-23 08:28:59');

-- --------------------------------------------------------

--
-- Table structure for table `assets`
--

CREATE TABLE `assets` (
  `id` int NOT NULL,
  `bg_front` text,
  `bg_back` text,
  `logo_url` text,
  `student_policy` text,
  `lecturer_policy` text,
  `admin_youtube` text,
  `admin_spotify` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `assets`
--

INSERT INTO `assets` (`id`, `bg_front`, `bg_back`, `logo_url`, `student_policy`, `lecturer_policy`, `admin_youtube`, `admin_spotify`) VALUES
(1, '', '', 'http://localhost:3001/api/files/cb9395ed-d838-4f22-a21f-1dea016ab4c4', '{}', '{}', 'https://youtube.com/playlist?list=PLZS-MHyEIRo6rAu3mYVNs2_y-fbJaOH5R&si=JYdVy3KE0LPqp5X9', 'https://open.spotify.com/playlist/5lEI5n2AhNOUmdV7cadt3P?si=facad6949828413b');

-- --------------------------------------------------------

--
-- Table structure for table `audit_forensics`
--

CREATE TABLE `audit_forensics` (
  `log_id` varchar(50) NOT NULL,
  `timestamp` datetime DEFAULT NULL,
  `actor` varchar(100) DEFAULT NULL,
  `action_type` varchar(255) DEFAULT NULL,
  `resource_id` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `metadata` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cdn_assets`
--

CREATE TABLE `cdn_assets` (
  `id` varchar(50) NOT NULL,
  `cdn_file_id` varchar(255) DEFAULT NULL,
  `owner_id` varchar(100) DEFAULT NULL,
  `owner_role` varchar(20) DEFAULT NULL,
  `feature_type` varchar(50) DEFAULT NULL,
  `feature_id` varchar(100) DEFAULT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `file_size` bigint DEFAULT '0',
  `cdn_delivery_url` text,
  `cdn_status` varchar(30) DEFAULT 'PENDING',
  `is_private` tinyint(1) DEFAULT '0',
  `storage_provider` varchar(30) DEFAULT 'KROOMBOX_CDN',
  `created_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `cdn_assets`
--

INSERT INTO `cdn_assets` (`id`, `cdn_file_id`, `owner_id`, `owner_role`, `feature_type`, `feature_id`, `original_name`, `mime_type`, `file_size`, `cdn_delivery_url`, `cdn_status`, `is_private`, `storage_provider`, `created_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
('028117c4-c4a4-4497-87ef-f931dde248c1', '1dbbd19c91890928', 'ROOT', 'ADMIN', 'REPOSITORY_FILE', 'f341fae6-8aaa-44f5-a62b-451987c52be6', 'Ebi-1.JPG', 'image/jpeg', 3878722, 'https://api-cdn.kroombox.com/api/bridge/view/1dbbd19c91890928', 'DELETED', 1, 'KROOMBOX_CDN', 'ROOT', '2026-09-22 14:35:56', '2026-09-22 15:25:41', '2026-09-22 15:25:41'),
('05e5c0fa-adfc-4ada-be58-e5fb5c7b138c', 'a2e21b55030577f9', 'ROOT', 'ADMIN', 'ARTICLE_THUMBNAIL', 'art-05c6a7a7-55df-4b10-a028-5248418a0a19', 'art-05c6a7a7-55df-4b10-a028-5248418a0a19.jpg', 'image/jpeg', 551107, 'https://api-cdn.kroombox.com/api/bridge/view/a2e21b55030577f9', 'READY', 0, 'KROOMBOX_CDN', 'ROOT', '2026-09-23 09:32:13', '2026-09-23 09:32:25', NULL),
('083db272-9ef7-41a3-87ca-2479bde37e05', 'a734c7c12830af32', 'ROOT', 'ADMIN', 'REPOSITORY_FILE', '645033b8-5740-41e6-a6f3-0270a8582bb4', 'logo_ko+lab_dark.png', 'image/png', 14975, 'https://api-cdn.kroombox.com/api/bridge/view/a734c7c12830af32', 'READY', 1, 'KROOMBOX_CDN', 'ROOT', '2026-09-24 01:44:13', '2026-09-24 01:46:24', NULL),
('1f4c7a7a-ac77-4d1d-9a91-4b81b784c510', '678b31adad02d091', 'ROOT', 'ADMIN', 'REPOSITORY_FILE', '1fc55a07-c9ff-4a55-8c66-553f67fb27d8', 'jagofarm.jpg', 'image/jpeg', 3738, 'https://api-cdn.kroombox.com/api/bridge/view/678b31adad02d091', 'DELETED', 1, 'KROOMBOX_CDN', 'ROOT', '2026-09-22 15:51:56', '2026-09-22 15:52:22', '2026-09-22 15:52:22'),
('25152381-d8fd-43bb-8360-96ae0e2865e9', 'ce7f777b7c5e9451', 'ROOT', 'ADMIN', 'REPOSITORY_FILE', 'cdn-ce7f777b7c5e9451', 'preview-diagnostic.png', 'image/png', 14975, 'https://api-cdn.kroombox.com/api/bridge/view/ce7f777b7c5e9451', 'DELETED', 1, 'KROOMBOX_CDN', 'ROOT', '2026-09-22 15:48:56', '2026-09-24 01:49:34', '2026-09-24 01:49:34'),
('2f7b8ef7-0679-4cf7-8b02-5958c29cb8a2', '53bf84a774258f95', 'ROOT', 'ADMIN', 'EVENT', 'evt-1790149537960', 'evt-1790149537960.png', 'image/png', 2744372, 'https://api-cdn.kroombox.com/api/bridge/view/53bf84a774258f95', 'READY', 0, 'KROOMBOX_CDN', 'ROOT', '2026-09-23 07:45:38', '2026-09-23 07:46:16', NULL),
('32ca65fa-bdd8-4b02-8402-63df0f4fe90f', 'fdcd1505b8e62552', 'ROOT', 'ADMIN', 'ARTICLE_THUMBNAIL', 'art-b9192a79-528c-4f52-ac86-442515f4e6c6', 'art-b9192a79-528c-4f52-ac86-442515f4e6c6.png', 'image/png', 1559614, 'https://api-cdn.kroombox.com/api/bridge/view/fdcd1505b8e62552', 'READY', 0, 'KROOMBOX_CDN', 'ROOT', '2026-09-23 08:45:48', '2026-09-23 08:46:01', NULL),
('39a2a9d5-0071-4ed9-ac39-3387121c8e8f', '23f850c2b3323a99', 'ROOT', 'ADMIN', 'REPOSITORY_FILE', 'b81bb49a-9b39-4a3e-a350-98a06bef6f4a', 'photoIdCard-1790088604252.png', 'image/png', 492880, 'https://api-cdn.kroombox.com/api/bridge/view/23f850c2b3323a99', 'DELETED', 1, 'KROOMBOX_CDN', 'ROOT', '2026-09-22 14:50:04', '2026-09-22 15:25:24', '2026-09-22 15:25:24'),
('3c933701-aba1-419f-9d95-4ff1c5b35683', '21588983b8a24fa8', 'ROOT', 'ADMIN', 'ARTICLE_ATTACHMENT', 'art-1790150939809', '02_Class_Diagram_Arsitektur_Integrasi_API.pdf', 'application/pdf', 4719, 'https://api-cdn.kroombox.com/api/bridge/view/21588983b8a24fa8', 'READY', 0, 'KROOMBOX_CDN', 'ROOT', '2026-09-23 08:24:20', '2026-09-23 08:24:33', NULL),
('43e395b6-1d1a-4a27-8d3d-4e6bb189005c', '3a35ac8f4f62fa1e', 'ROOT', 'ADMIN', 'STARTUP', 'item-ae7e384e-d902-4408-8f86-47ef925cd046', 'logo-startup-1790071136748.png', 'image/png', 2908, 'https://api-cdn.kroombox.com/api/bridge/view/3a35ac8f4f62fa1e', 'READY', 0, 'KROOMBOX_CDN', 'ROOT', '2026-09-22 09:58:56', '2026-09-22 09:59:04', NULL),
('519ffa4e-2ee0-4785-a43d-23ae5fd4be1e', '2a43035f18ef49d0', 'ROOT', 'ADMIN', 'REPOSITORY_FILE', 'd72ec55e-9279-499f-be61-c10e4f56e19f', 'logo ko+Lab light.png', 'image/png', 15338, 'https://api-cdn.kroombox.com/api/bridge/view/2a43035f18ef49d0', 'DELETED', 1, 'KROOMBOX_CDN', 'ROOT', '2026-09-22 12:28:26', '2026-09-22 15:25:58', '2026-09-22 15:25:58'),
('52fc984d-1a10-4529-8280-4e4cef36a75e', '9235b069b938b252', 'ROOT', 'ADMIN', 'STARTUP', 'item-da2166d6-b816-490e-bdeb-87e2e1b049a3', 'logo-startup-1790205908092.png', 'image/png', 4087, 'https://api-cdn.kroombox.com/api/bridge/view/9235b069b938b252', 'READY', 0, 'KROOMBOX_CDN', 'ROOT', '2026-09-23 23:25:08', '2026-09-23 23:25:13', NULL),
('59727d30-1882-46ce-99de-7b947b9b63aa', '81d28d3cc8b4ae9d', 'ROOT', 'ADMIN', 'ARTICLE_ATTACHMENT', 'art-8a3dcd0c-3e93-4111-8487-918b0f3ffd6a', '01_Template_Struktur_Harga_Basic_Standard_Premium.pdf', 'application/pdf', 51436, 'https://api-cdn.kroombox.com/api/bridge/view/81d28d3cc8b4ae9d', 'READY', 0, 'KROOMBOX_CDN', 'ROOT', '2026-09-23 08:28:31', '2026-09-23 08:28:44', NULL),
('63c876d6-20af-462b-afc4-075e73898c92', 'f460ab080f20da32', 'ROOT', 'ADMIN', 'REPOSITORY_FILE', 'cc4989a5-2cbc-4c5e-b88a-d3c861226777', 'logo_ko+lab_dark.png', 'image/png', 14975, 'https://api-cdn.kroombox.com/api/bridge/view/f460ab080f20da32', 'READY', 1, 'KROOMBOX_CDN', 'ROOT', '2026-09-22 14:43:32', '2026-09-22 15:48:56', NULL),
('7050995b-27cb-4470-adaf-205ec77a9c74', 'e868677c03b183f1', 'ROOT', 'ADMIN', 'REPOSITORY_FILE', '9283f653-31ca-4367-ac84-f58d75d95617', 'photoIdCard-1790090644751.png', 'image/png', 476036, 'https://api-cdn.kroombox.com/api/bridge/view/e868677c03b183f1', 'READY', 1, 'KROOMBOX_CDN', 'ROOT', '2026-09-22 15:24:05', '2026-09-22 15:24:12', NULL),
('70d5a82f-3482-4f18-9c7a-f26af90b64e0', '1cdf5ff5051e3336', 'ROOT', 'ADMIN', 'REPOSITORY_FILE', 'cb9395ed-d838-4f22-a21f-1dea016ab4c4', 'logo_ko+Lab_light.png', 'image/png', 15338, 'https://api-cdn.kroombox.com/api/bridge/view/1cdf5ff5051e3336', 'READY', 1, 'KROOMBOX_CDN', 'ROOT', '2026-09-24 01:44:29', '2026-09-24 01:46:24', NULL),
('7dba2c8f-c010-4840-a063-681e48486c58', '74d9178c49fe51a7', 'ROOT', 'ADMIN', 'ARTICLE_ATTACHMENT', 'art-b9192a79-528c-4f52-ac86-442515f4e6c6', '01_Sequence_Diagram_Integrasi_API_AI.pdf', 'application/pdf', 3946, 'https://api-cdn.kroombox.com/api/bridge/view/74d9178c49fe51a7', 'READY', 0, 'KROOMBOX_CDN', 'ROOT', '2026-09-23 08:46:01', '2026-09-23 08:46:09', NULL),
('801d19eb-af9a-42f0-b7bb-e0c44f8fe05c', '43a5e5dea270ffee', 'ROOT', 'ADMIN', 'REPOSITORY_FILE', '5e21af53-b534-4406-8f06-953ce3c478aa', 'logo_ko+Lab_light.png', 'image/png', 15338, 'https://api-cdn.kroombox.com/api/bridge/view/43a5e5dea270ffee', 'READY', 1, 'KROOMBOX_CDN', 'ROOT', '2026-09-23 22:59:53', '2026-09-24 00:28:18', NULL),
('82a22ecd-b47d-47e8-afa2-2cf288c3743b', '8d215700479aaa8e', 'ROOT', 'ADMIN', 'ARTICLE_THUMBNAIL', 'art-8a3dcd0c-3e93-4111-8487-918b0f3ffd6a', 'art-8a3dcd0c-3e93-4111-8487-918b0f3ffd6a.png', 'image/png', 1947506, 'https://api-cdn.kroombox.com/api/bridge/view/8d215700479aaa8e', 'READY', 0, 'KROOMBOX_CDN', 'ROOT', '2026-09-23 08:28:17', '2026-09-23 08:28:31', NULL),
('8753f535-872f-46ce-91ce-3d0eefc301d7', '537552ef3b5452b9', 'ROOT', 'ADMIN', 'REPOSITORY_FILE', 'cb2bd33b-8cca-47bf-9846-b5cd3521532f', 'photoIdCard-1790088400218.png', 'image/png', 437549, 'https://api-cdn.kroombox.com/api/bridge/view/537552ef3b5452b9', 'DELETED', 1, 'KROOMBOX_CDN', 'ROOT', '2026-09-22 14:46:40', '2026-09-22 15:25:32', '2026-09-22 15:25:32'),
('8d1059fe-c193-4921-a401-6c3201394762', 'd024f4a6fab6cc8a', 'ROOT', 'ADMIN', 'ARTICLE_ATTACHMENT', 'art-8a3dcd0c-3e93-4111-8487-918b0f3ffd6a', '03_Template_Freelance_Offer_Readiness.pdf', 'application/pdf', 49083, 'https://api-cdn.kroombox.com/api/bridge/view/d024f4a6fab6cc8a', 'READY', 0, 'KROOMBOX_CDN', 'ROOT', '2026-09-23 08:28:51', '2026-09-23 08:28:59', NULL),
('944fee26-0002-462d-a4a5-78422ae852f4', '38df62cae7844630', 'ROOT', 'ADMIN', 'EVENT', 'evt-1790149064086', 'evt-1790149064086.png', 'image/png', 3432497, 'https://api-cdn.kroombox.com/api/bridge/view/38df62cae7844630', 'READY', 0, 'KROOMBOX_CDN', 'ROOT', '2026-09-23 07:41:16', '2026-09-23 07:41:32', NULL),
('a1e30205-016d-41ff-aa94-57423a7b39a5', '35702da3893c5073', 'ROOT', 'ADMIN', 'ARTICLE', 'art-1790150939809', 'art-1790150939809.png', 'image/png', 1559614, 'https://api-cdn.kroombox.com/api/bridge/view/35702da3893c5073', 'READY', 0, 'KROOMBOX_CDN', 'ROOT', '2026-09-23 08:08:59', '2026-09-23 08:09:14', NULL),
('a2f47a1a-dd43-4438-9b62-4cbfac710658', '2ac4b7fb5a317d21', 'ROOT', 'ADMIN', 'REPOSITORY_FILE', '530ef5fa-5c6a-42b4-b940-a729d1898b18', 'logo_ko+lab_dark.png', 'image/png', 14975, 'https://api-cdn.kroombox.com/api/bridge/view/2ac4b7fb5a317d21', 'READY', 1, 'KROOMBOX_CDN', 'ROOT', '2026-09-22 14:49:30', '2026-09-22 15:48:56', NULL),
('a7925a90-95da-44d7-8671-ae2b92d7e52b', '9f3ac74f2f1152a6', 'ROOT', 'ADMIN', 'REPOSITORY_FILE', '1075de47-ab8c-407f-9b2c-f626fcdf807a', 'logo ko+lab dark.png', 'image/png', 14975, 'https://api-cdn.kroombox.com/api/bridge/view/9f3ac74f2f1152a6', 'DELETED', 1, 'KROOMBOX_CDN', 'ROOT', '2026-09-22 14:17:40', '2026-09-22 15:25:51', '2026-09-22 15:25:51'),
('b689b7e9-6f9b-44f1-94e1-083ac7428f66', 'e129f11beaccc089', 'ROOT', 'ADMIN', 'REPOSITORY_FILE', '67cd8244-94e2-4c37-9797-0f62e10688ee', 'logo_ngolab.jpg', 'image/jpeg', 3933, 'https://api-cdn.kroombox.com/api/bridge/view/e129f11beaccc089', 'READY', 1, 'KROOMBOX_CDN', 'ROOT', '2026-09-22 15:24:19', '2026-09-22 15:48:56', NULL),
('b78ca3f8-037d-460e-a5f5-796f5c4c39fe', 'bf5f817d33f0bfd7', 'ROOT', 'ADMIN', 'ARTICLE_ATTACHMENT', 'art-8a3dcd0c-3e93-4111-8487-918b0f3ffd6a', '02_Checklist_Materi_Promosi_Freelance.pdf', 'application/pdf', 51123, 'https://api-cdn.kroombox.com/api/bridge/view/bf5f817d33f0bfd7', 'READY', 0, 'KROOMBOX_CDN', 'ROOT', '2026-09-23 08:28:44', '2026-09-23 08:28:51', NULL),
('bfb636d2-d512-454d-9b75-36bc9ce788cc', 'e774051d654c2a96', 'ROOT', 'ADMIN', 'REPOSITORY_FILE', '52d1a85f-b1a2-4bfe-a3d6-487432e56d96', 'logo ko+lab dark.png', 'image/png', 14975, 'https://api-cdn.kroombox.com/api/bridge/view/e774051d654c2a96', 'DELETED', 1, 'KROOMBOX_CDN', 'ROOT', '2026-09-22 14:40:13', '2026-09-22 15:26:13', '2026-09-22 15:26:13'),
('c8b001d8-caa5-4833-8e5a-9c8be8bbdec9', '780227afc41487bd', 'ROOT', 'ADMIN', 'REPOSITORY_FILE', '3a47fa4d-3d02-4eb6-9cb6-fc185a60c1d1', 'logo ko+lab dark.png', 'image/png', 14975, 'https://api-cdn.kroombox.com/api/bridge/view/780227afc41487bd', 'DELETED', 1, 'KROOMBOX_CDN', 'ROOT', '2026-09-22 14:31:27', '2026-09-22 15:26:18', '2026-09-22 15:26:18'),
('d92aad4b-9bb1-4e83-832f-53358eb01b36', 'f34d2509d0028a89', 'ROOT', 'ADMIN', 'REPOSITORY_FILE', 'e51dab37-272d-4bfd-b6de-dbda817c9119', 'logo ko+lab dark.png', 'image/png', 14975, 'https://api-cdn.kroombox.com/api/bridge/view/f34d2509d0028a89', 'DELETED', 1, 'KROOMBOX_CDN', 'ROOT', '2026-09-22 12:39:29', '2026-09-22 15:25:53', '2026-09-22 15:25:53'),
('dc070d8f-f13a-465a-9ecc-ea00b2137544', 'ff3029ed8149a919', 'ROOT', 'ADMIN', 'REPOSITORY_FILE', '22a1cfcb-dad8-43de-a3dd-97c84a08f7cf', 'logo ko+lab dark.png', 'image/png', 14975, 'https://api-cdn.kroombox.com/api/bridge/view/ff3029ed8149a919', 'DELETED', 1, 'KROOMBOX_CDN', 'ROOT', '2026-09-22 12:27:38', '2026-09-22 15:26:04', '2026-09-22 15:26:04'),
('df3840b1-d46a-4be0-a41e-dc49ed2b35e6', '9fa3e79377f0e3bb', 'ROOT', 'ADMIN', 'STARTUP', 'item-38f6122c-5c51-47ea-998c-39be69c4c7ed', 'logo-startup-1790071210963.png', 'image/png', 4294, 'https://api-cdn.kroombox.com/api/bridge/view/9fa3e79377f0e3bb', 'READY', 0, 'KROOMBOX_CDN', 'ROOT', '2026-09-22 10:00:10', '2026-09-22 10:00:18', NULL),
('e8c87c2d-5753-4351-a4f7-f8074cd12f42', '7b3f91c104bc67f7', 'ROOT', 'ADMIN', 'REPOSITORY_FILE', '9d4e794c-f607-4f10-9f81-dda50378bb4b', 'logo kroombox.jpg', 'image/jpeg', 4294, 'https://api-cdn.kroombox.com/api/bridge/view/7b3f91c104bc67f7', 'DELETED', 1, 'KROOMBOX_CDN', 'ROOT', '2026-09-22 15:53:35', '2026-09-22 15:53:56', '2026-09-22 15:53:56'),
('f13b038d-d9f5-4301-945d-af07c89ee138', 'de3c4d34c20e1d55', 'ROOT', 'ADMIN', 'ARTICLE_ATTACHMENT', 'art-1790150939809', '01_Sequence_Diagram_Integrasi_API_AI.pdf', 'application/pdf', 3946, 'https://api-cdn.kroombox.com/api/bridge/view/de3c4d34c20e1d55', 'READY', 0, 'KROOMBOX_CDN', 'ROOT', '2026-09-23 08:24:12', '2026-09-23 08:24:20', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

CREATE TABLE `events` (
  `id` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `date` date DEFAULT NULL,
  `image_url` text,
  `description` text,
  `location_offline` varchar(255) DEFAULT NULL,
  `location_online` varchar(255) DEFAULT NULL,
  `max_participants` int DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `tags` text,
  `meet_link` text,
  `time` time DEFAULT NULL,
  `author` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `events`
--

INSERT INTO `events` (`id`, `title`, `date`, `image_url`, `description`, `location_offline`, `location_online`, `max_participants`, `status`, `tags`, `meet_link`, `time`, `author`) VALUES
('evt-1790149064086', 'Workshop Strategi Kolaborasi 2026', '2026-10-15', 'https://api-cdn.kroombox.com/api/bridge/view/38df62cae7844630', 'Sesi workshop interaktif yang ditujukan untuk meningkatkan strategi kolaborasi antar tim. Peserta diwajibkan membawa laptop masing-masing untuk sesi praktik.', 'Coworking Labs Lt 4 FIT', 'No', 50, 'OPEN', '[\"null\"]', '', '09:00:00', 'ROOT'),
('evt-1790149537960', 'Townhall & Evaluasi Kinerja Q3', '2026-10-02', 'https://api-cdn.kroombox.com/api/bridge/view/53bf84a774258f95', 'Pertemuan rutin kuartal ketiga bagi seluruh anggota. Sesi ini akan membahas pencapaian selama Q3 serta pemaparan target untuk akhir tahun. Silakan bergabung tepat waktu.', '', 'Yes', 50, 'OPEN', '[\"null\"]', 'https://meet.google.com/hjb-hzvt-buy', '14:00:00', 'ROOT');

-- --------------------------------------------------------

--
-- Table structure for table `file_blobs`
--

CREATE TABLE `file_blobs` (
  `repo_id` varchar(100) NOT NULL,
  `content` longblob NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `information`
--

CREATE TABLE `information` (
  `id` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `date` datetime DEFAULT NULL,
  `description` text,
  `author` varchar(100) DEFAULT NULL,
  `target_type` varchar(50) DEFAULT NULL,
  `target_value` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `information`
--

INSERT INTO `information` (`id`, `title`, `date`, `description`, `author`, `target_type`, `target_value`) VALUES
('item-1fd23b69-c73d-411a-b94c-b5d0ad04099e', 'Kebersihan Ruang Kerja', '2026-09-23 00:00:00', 'Mohon kepada semua startup untuk selalu menjaga kebersihan ruangannya', 'HR Kolab', 'STARTUP_ALL', ''),
('item-61351b2f-7b50-4aa5-9813-2806df303f33', 'Laporan Harian', '2026-09-23 00:00:00', 'Jangan lupa diisi laporan hariannya di aplikasi absensi', 'HR Kolab', 'ROLE_STUDENT', ''),
('item-d3d9d8ed-9cd0-4f78-aad6-b601ae9f78b4', 'Reminder SOP', '2026-09-23 00:00:00', 'mohon untuk dibuatkan SOP dapur supaya dapur selalu bisa bersih', 'HR Kolab', 'STARTUP_SPECIFIC', 'item-5611c4d2-2507-49fc-992e-ec2c95056f11'),
('item-d9c9b63d-bac9-4345-b22d-04c82fddba1e', 'Ko+Lab Mini Soccer', '2026-09-23 00:00:00', 'Hari Kamis 24 September 2026, diadakan acara minisoccer jam 16.00 - 17.00. Mohon laki-laki join main yah', 'HR Kolab', 'ALL', ''),
('item-f0a72535-1d23-4881-b632-7179af90c771', 'Plotting Bimbingan', '2026-09-23 00:00:00', 'Mohon kepada semua dosen untuk menentukan mahasiswa bimbingannya, terimakasih atas perhatiannya', 'HR Kolab', 'ROLE_LECTURER', '');

-- --------------------------------------------------------

--
-- Table structure for table `integration_results`
--

CREATE TABLE `integration_results` (
  `id` varchar(36) NOT NULL,
  `action` varchar(100) DEFAULT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `request_data` longtext,
  `response_data` longtext,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `internships`
--

CREATE TABLE `internships` (
  `id` varchar(50) NOT NULL,
  `student_nim` varchar(20) NOT NULL,
  `startup_id` varchar(50) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `field_supervisor` varchar(150) DEFAULT NULL,
  `academic_supervisor_nip` varchar(20) DEFAULT NULL,
  `academic_supervisor2_nip` varchar(20) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'PLANNED',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `internships`
--

INSERT INTO `internships` (`id`, `student_nim`, `startup_id`, `start_date`, `end_date`, `field_supervisor`, `academic_supervisor_nip`, `academic_supervisor2_nip`, `status`, `created_at`, `updated_at`) VALUES
('internship-00067c41-6af4-4eac-a8fc-f3f90112d251', '607012400100', 'item-ae7e384e-d902-4408-8f86-47ef925cd046', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:06:02', '2026-09-21 02:06:02'),
('internship-05cbc87f-be63-4f17-a4fa-81d3a0d91c02', '607012400092', 'item-141bb68d-e7d9-4140-89af-e0556c2b23cb', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:09:07', '2026-09-21 03:21:03'),
('internship-119df01f-a95f-445b-9adc-adec8fe775d9', '607012400106', 'item-ae7e384e-d902-4408-8f86-47ef925cd046', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:06:02', '2026-09-21 02:06:02'),
('internship-14e086f2-a8bc-4ed8-9782-5f1356eb976b', '607012400063', 'item-ae7e384e-d902-4408-8f86-47ef925cd046', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:06:02', '2026-09-21 02:06:02'),
('internship-198683e5-7bd2-426c-b6dd-8b4f4baa53fe', '607012400053', 'item-5611c4d2-2507-49fc-992e-ec2c95056f11', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:08:44', '2026-09-21 02:08:44'),
('internship-1cfa23ea-8a17-49c3-85a9-e361bb2b05df', '607012400068', 'item-b25a6e5e-cf79-46a6-a3cd-a5f0d52a458e', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:08:18', '2026-09-21 02:08:18'),
('internship-22c55f66-9124-4391-8434-5db62bfaaa03', '607012430004', 'item-da2166d6-b816-490e-bdeb-87e2e1b049a3', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:05:22', '2026-09-21 02:06:12'),
('internship-30738db2-3e84-48a3-8fc8-8437f2f27960', '607012400044', 'item-38f6122c-5c51-47ea-998c-39be69c4c7ed', '2026-07-07', '2027-04-30', NULL, NULL, NULL, 'ONGOING', '2026-09-21 02:02:39', '2026-09-21 02:02:39'),
('internship-41af6116-82d5-48d0-be62-ae254f9202e3', '607012400069', 'item-38f6122c-5c51-47ea-998c-39be69c4c7ed', '2026-07-07', '2027-04-30', NULL, NULL, NULL, 'ONGOING', '2026-09-21 02:02:39', '2026-09-21 02:02:39'),
('internship-44306cbd-8cff-4edb-b50e-24fa6c192126', '607012400136', 'item-141bb68d-e7d9-4140-89af-e0556c2b23cb', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:09:07', '2026-09-21 03:21:09'),
('internship-4ac8c9e6-1d37-40b0-bc98-1880e218e167', '607012430006', 'item-ae7e384e-d902-4408-8f86-47ef925cd046', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:06:02', '2026-09-21 02:06:02'),
('internship-533cefd6-442b-47b6-9d1c-9d998f4aaf15', '607012430008', 'item-da2166d6-b816-490e-bdeb-87e2e1b049a3', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:05:22', '2026-09-21 02:06:34'),
('internship-583606ef-f83a-4733-a88b-625955192a38', '607012430011', 'item-ae7e384e-d902-4408-8f86-47ef925cd046', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:06:02', '2026-09-21 02:06:02'),
('internship-67d18988-91bb-4c56-9744-d19a6cafa38b', '607012400035', 'item-da2166d6-b816-490e-bdeb-87e2e1b049a3', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:05:22', '2026-09-21 02:06:26'),
('internship-696e5cdb-d92f-4887-bc2c-0f33307b6b90', '607012430001', 'item-ae7e384e-d902-4408-8f86-47ef925cd046', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:06:02', '2026-09-21 02:06:02'),
('internship-6d948ec5-11b4-48e6-bed3-fe9911cd22c4', '607012400075', 'item-b25a6e5e-cf79-46a6-a3cd-a5f0d52a458e', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:08:18', '2026-09-21 02:08:18'),
('internship-7720c766-e50c-4069-85a0-952cd0d11160', '607012400052', 'item-38f6122c-5c51-47ea-998c-39be69c4c7ed', '2026-07-07', '2027-04-30', NULL, NULL, NULL, 'ONGOING', '2026-09-21 02:02:39', '2026-09-21 02:02:39'),
('internship-7bf6fcfc-3ea0-4241-8791-b4afa40b5af9', '607012430010', 'item-38f6122c-5c51-47ea-998c-39be69c4c7ed', '2026-07-07', '2027-04-30', NULL, NULL, NULL, 'ONGOING', '2026-09-21 02:02:39', '2026-09-21 02:02:39'),
('internship-7f722c65-5e67-468d-88d7-d8158c04829c', '607012400003', 'item-38f6122c-5c51-47ea-998c-39be69c4c7ed', '2026-07-07', '2027-04-30', NULL, NULL, NULL, 'ONGOING', '2026-09-21 02:02:39', '2026-09-21 02:02:39'),
('internship-8905de83-962f-4204-9202-782837300cda', '607012400123', 'item-38f6122c-5c51-47ea-998c-39be69c4c7ed', '2026-07-07', '2027-04-30', NULL, NULL, NULL, 'ONGOING', '2026-09-21 02:02:39', '2026-09-21 02:02:39'),
('internship-a286414f-b0f1-4ab9-ae78-df14ee4da0fe', '607012400008', 'item-ae7e384e-d902-4408-8f86-47ef925cd046', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:06:02', '2026-09-21 02:06:02'),
('internship-a539986e-08ec-40b8-9740-c6e28f7a02db', '607012400073', 'item-ae7e384e-d902-4408-8f86-47ef925cd046', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:06:02', '2026-09-21 02:06:02'),
('internship-a735b844-5e73-41a1-9448-3a8da492e327', '607012430005', 'item-38f6122c-5c51-47ea-998c-39be69c4c7ed', '2026-07-07', '2027-04-30', NULL, NULL, NULL, 'ONGOING', '2026-09-21 02:02:39', '2026-09-21 02:02:39'),
('internship-c24bb38c-ac28-4bdf-b14e-3f6134263358', '607012430009', 'item-5611c4d2-2507-49fc-992e-ec2c95056f11', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:08:44', '2026-09-21 02:08:44'),
('internship-c480cd34-cb1a-402e-b7d5-71bae7603663', '607012400076', 'item-5611c4d2-2507-49fc-992e-ec2c95056f11', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:08:44', '2026-09-21 02:08:44'),
('internship-ca3cfd2f-bdae-492a-9418-549dbc584e61', '607012400131', 'item-141bb68d-e7d9-4140-89af-e0556c2b23cb', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:09:07', '2026-09-21 03:21:15'),
('internship-ccd5f3ca-55db-4d1c-bb44-8d1df482558a', '607012400047', 'item-da2166d6-b816-490e-bdeb-87e2e1b049a3', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:05:22', '2026-09-21 02:06:40'),
('internship-d703c33c-9691-44ce-a72c-b93902abccf4', '607012400019', 'item-b25a6e5e-cf79-46a6-a3cd-a5f0d52a458e', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:08:18', '2026-09-21 02:08:18'),
('internship-d753536a-abd8-45b7-a688-47a784d9569f', '607012400125', 'item-ae7e384e-d902-4408-8f86-47ef925cd046', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:06:02', '2026-09-21 02:06:02'),
('internship-db49fda7-e9f0-4687-bda6-348227e2f611', '607012400059', 'item-141bb68d-e7d9-4140-89af-e0556c2b23cb', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:09:07', '2026-09-21 03:21:21'),
('internship-deeb6183-509e-4c35-a182-07c842cf53f4', '607012400055', 'item-da2166d6-b816-490e-bdeb-87e2e1b049a3', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:05:22', '2026-09-21 02:06:45'),
('internship-df0e014b-0a58-4f7b-8220-25156f6fe61a', '607012400128', 'item-38f6122c-5c51-47ea-998c-39be69c4c7ed', '2026-07-07', '2027-04-30', NULL, NULL, NULL, 'ONGOING', '2026-09-21 02:02:39', '2026-09-21 02:02:39'),
('internship-e8ca32f6-ebbe-4a9c-ac96-47ac12243d48', '607012400032', 'item-b25a6e5e-cf79-46a6-a3cd-a5f0d52a458e', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:08:18', '2026-09-21 02:08:18'),
('internship-eea2413c-96e7-4ea4-97ba-bd4e65adad82', '607012400072', 'item-da2166d6-b816-490e-bdeb-87e2e1b049a3', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:05:22', '2026-09-21 02:06:53'),
('internship-f9874fc1-67e1-428e-9752-5e008adc2502', '607012400060', 'item-5611c4d2-2507-49fc-992e-ec2c95056f11', '2026-07-07', '2027-04-30', 'Maulana Febrian', NULL, NULL, 'ONGOING', '2026-09-21 02:08:44', '2026-09-21 02:08:44');

-- --------------------------------------------------------

--
-- Table structure for table `lecturers`
--

CREATE TABLE `lecturers` (
  `nip` varchar(20) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `avatar` text,
  `photo_id` text,
  `job_desks` text,
  `code` varchar(20) DEFAULT NULL,
  `is_approved` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `custom_quota` bigint DEFAULT '1073741824',
  `custom_max_upload` bigint DEFAULT '52428800',
  `youtube` text,
  `spotify` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `lecturers`
--

INSERT INTO `lecturers` (`nip`, `password`, `name`, `email`, `avatar`, `photo_id`, `job_desks`, `code`, `is_approved`, `is_active`, `custom_quota`, `custom_max_upload`, `youtube`, `spotify`, `created_at`) VALUES
('11810053', '66a5c6a12d05bbc2feb2819bc83e3bedff95d40dc12a5599fc189681cb024ef5', 'Heru Nugroho', NULL, 'https://i.pravatar.cc/150', NULL, NULL, 'HRO', 1, 1, 1073741824, 52428800, NULL, NULL, '2026-09-21 02:13:46'),
('25850011', '66a5c6a12d05bbc2feb2819bc83e3bedff95d40dc12a5599fc189681cb024ef5', 'Robbi Hendriyanto', NULL, 'https://i.pravatar.cc/150', NULL, NULL, 'RHN', 1, 1, 1073741824, 52428800, NULL, NULL, '2026-09-21 02:13:21'),
('25980015', '66a5c6a12d05bbc2feb2819bc83e3bedff95d40dc12a5599fc189681cb024ef5', 'Muhamma Yusuf Ramadhan', NULL, 'https://i.pravatar.cc/150', NULL, NULL, 'MFH', 1, 1, 1073741824, 52428800, NULL, NULL, '2026-09-21 02:14:46');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` varchar(50) NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` text,
  `timestamp` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `type`, `title`, `message`, `timestamp`) VALUES
('2fa06afc-a8df-4d29-8585-59b77167b7ac', 'ANNOUNCEMENT', 'Pembaruan portal', 'Konten baru tersedia di portal.', '2026-09-24 05:44:06'),
('3e03a0f1-0aa8-421f-8479-bd8153a902f9', 'SCHEDULE', 'Pembaruan portal', 'Konten baru tersedia di portal.', '2026-09-23 14:32:26'),
('4e65c770-3bfe-4aac-8dba-85ec55bed8c3', 'ANNOUNCEMENT', 'Pembaruan portal', 'Konten baru tersedia di portal.', '2026-09-24 05:50:35'),
('5c5142be-4615-402f-824b-210b7ef570b8', 'INFO', 'Pembaruan portal', 'Konten baru tersedia di portal.', '2026-09-23 13:36:12'),
('67df8717-5e9a-4eb2-8d94-11d76dc9c75d', 'INFO', 'Pembaruan portal', 'Konten baru tersedia di portal.', '2026-09-23 13:31:31'),
('a97e1506-1931-4433-838f-a5f9956e6ec4', 'ANNOUNCEMENT', 'Pembaruan portal', 'Konten baru tersedia di portal.', '2026-09-24 05:44:54'),
('b9bc08fc-6b36-41f5-ad46-3a6c56ffa107', 'INFO', 'Pembaruan portal', 'Konten baru tersedia di portal.', '2026-09-23 13:32:38'),
('c107963e-aedd-448a-b832-3e56ac3347a3', 'INFO', 'Pembaruan portal', 'Konten baru tersedia di portal.', '2026-09-23 14:30:55'),
('e1fbe041-237b-4be3-aebc-f909a00f0c49', 'INFO', 'Pembaruan portal', 'Konten baru tersedia di portal.', '2026-09-23 13:34:51');

-- --------------------------------------------------------

--
-- Table structure for table `photobooth_settings`
--

CREATE TABLE `photobooth_settings` (
  `category` varchar(50) NOT NULL,
  `data` longtext NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `repo`
--

CREATE TABLE `repo` (
  `id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `url` text,
  `date` datetime DEFAULT NULL,
  `size` bigint DEFAULT NULL,
  `mime` varchar(100) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `owner_id` varchar(50) DEFAULT NULL,
  `role` enum('STUDENT','LECTURER','ADMIN') DEFAULT NULL,
  `parent_id` varchar(100) DEFAULT NULL,
  `type` enum('FILE','FOLDER') DEFAULT NULL,
  `cdn_asset_id` varchar(50) DEFAULT NULL,
  `storage_provider` varchar(30) DEFAULT 'LEGACY'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `repo`
--

INSERT INTO `repo` (`id`, `name`, `url`, `date`, `size`, `mime`, `category`, `owner_id`, `role`, `parent_id`, `type`, `cdn_asset_id`, `storage_provider`) VALUES
('530ef5fa-5c6a-42b4-b940-a729d1898b18', 'logo_ko+lab_dark.png', 'http://localhost:3001/api/files/530ef5fa-5c6a-42b4-b940-a729d1898b18', '2026-09-22 21:49:30', 14975, 'image/png', 'image', 'ROOT', 'ADMIN', 'ROOT', 'FILE', '2ac4b7fb5a317d21', 'KROOMBOX_CDN'),
('5e21af53-b534-4406-8f06-953ce3c478aa', 'logo_ko+Lab_light.png', 'http://localhost:3001/api/files/5e21af53-b534-4406-8f06-953ce3c478aa', '2026-09-24 05:59:53', 15338, 'image/png', 'image', 'ROOT', 'ADMIN', 'ROOT', 'FILE', '43a5e5dea270ffee', 'KROOMBOX_CDN'),
('645033b8-5740-41e6-a6f3-0270a8582bb4', 'logo_ko+lab_dark.png', 'http://localhost:3001/api/files/645033b8-5740-41e6-a6f3-0270a8582bb4', '2026-09-24 08:44:13', 14975, 'image/png', 'image', 'ROOT', 'ADMIN', 'ROOT', 'FILE', 'a734c7c12830af32', 'KROOMBOX_CDN'),
('67cd8244-94e2-4c37-9797-0f62e10688ee', 'logo_ngolab.jpg', 'http://localhost:3001/api/files/67cd8244-94e2-4c37-9797-0f62e10688ee', '2026-09-22 22:24:19', 3933, 'image/jpeg', 'image', 'ROOT', 'ADMIN', 'ROOT', 'FILE', 'e129f11beaccc089', 'KROOMBOX_CDN'),
('9283f653-31ca-4367-ac84-f58d75d95617', 'photoIdCard-1790090644751.png', 'http://localhost:3001/api/files/9283f653-31ca-4367-ac84-f58d75d95617', '2026-09-22 22:24:05', 476036, 'image/png', 'image', 'ROOT', 'ADMIN', 'ROOT', 'FILE', 'e868677c03b183f1', 'KROOMBOX_CDN'),
('cb9395ed-d838-4f22-a21f-1dea016ab4c4', 'logo_ko+Lab_light.png', 'http://localhost:3001/api/files/cb9395ed-d838-4f22-a21f-1dea016ab4c4', '2026-09-24 08:44:29', 15338, 'image/png', 'image', 'ROOT', 'ADMIN', 'ROOT', 'FILE', '1cdf5ff5051e3336', 'KROOMBOX_CDN'),
('cc4989a5-2cbc-4c5e-b88a-d3c861226777', 'logo_ko+lab_dark.png', 'http://localhost:3001/api/files/cc4989a5-2cbc-4c5e-b88a-d3c861226777', '2026-09-22 21:43:32', 14975, 'image/png', 'image', 'ROOT', 'ADMIN', 'ROOT', 'FILE', 'f460ab080f20da32', 'KROOMBOX_CDN'),
('cdn-ce7f777b7c5e9451', 'preview-diagnostic.png', '/api/files/cdn-ce7f777b7c5e9451', '2026-09-22 22:48:56', 14975, 'image/png', 'image', 'ROOT', 'ADMIN', 'ROOT', 'FILE', 'ce7f777b7c5e9451', 'KROOMBOX_CDN'),
('dbaac427-03bd-4eda-bc0d-aa710ef88e8b', 'foto', '', '2026-09-22 22:53:06', 0, 'folder', 'folder', 'ROOT', 'ADMIN', 'ROOT', 'FOLDER', NULL, 'LEGACY');

-- --------------------------------------------------------

--
-- Table structure for table `schedules`
--

CREATE TABLE `schedules` (
  `id` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `date` date DEFAULT NULL,
  `time` time DEFAULT NULL,
  `location_offline` varchar(255) DEFAULT NULL,
  `location_online` tinyint(1) DEFAULT NULL,
  `meet_link` text,
  `organizer` varchar(100) DEFAULT NULL,
  `description` text,
  `end_time` time DEFAULT NULL,
  `author` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `schedules`
--

INSERT INTO `schedules` (`id`, `title`, `date`, `time`, `location_offline`, `location_online`, `meet_link`, `organizer`, `description`, `end_time`, `author`) VALUES
('item-0ac472e4-06d9-4374-955c-9746d318b05b', 'meet Ngolab', '2026-09-28', '11:00:00', 'Coworking', 0, '', 'Maulana', 'Briefing untuk SOP dapur', NULL, 'HR Kolab');

-- --------------------------------------------------------

--
-- Table structure for table `startup_teams`
--

CREATE TABLE `startup_teams` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `website` text,
  `ig` text,
  `tiktok` text,
  `linkedin` text,
  `logo` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `startup_teams`
--

INSERT INTO `startup_teams` (`id`, `name`, `website`, `ig`, `tiktok`, `linkedin`, `logo`) VALUES
('item-141bb68d-e7d9-4140-89af-e0556c2b23cb', 'Sorgummi', '', '', '', '', ''),
('item-38f6122c-5c51-47ea-998c-39be69c4c7ed', 'Kroombox', 'https://kroombox.com/', 'https://www.instagram.com/kroombox?stkn=a3RvM3JwN2lhZndx', '', '', 'https://api-cdn.kroombox.com/api/bridge/view/9fa3e79377f0e3bb'),
('item-5611c4d2-2507-49fc-992e-ec2c95056f11', 'Ngolab', '', '', '', '', ''),
('item-ae7e384e-d902-4408-8f86-47ef925cd046', 'Uni Inside', 'https://uniinside.net/', 'uniinside.studio', '', '', 'https://api-cdn.kroombox.com/api/bridge/view/3a35ac8f4f62fa1e'),
('item-b25a6e5e-cf79-46a6-a3cd-a5f0d52a458e', 'JagoFarm', '', '', '', '', ''),
('item-da2166d6-b816-490e-bdeb-87e2e1b049a3', 'JagoAI', 'https://jagoai.dev/', '@jagoAI', '', '', 'https://api-cdn.kroombox.com/api/bridge/view/9235b069b938b252');

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `nim` varchar(20) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `avatar` text,
  `photo_id` text,
  `type` enum('STARTUP','NON_STARTUP') DEFAULT 'NON_STARTUP',
  `startup_id` varchar(50) DEFAULT NULL,
  `job_desk` varchar(100) DEFAULT NULL,
  `is_approved` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `custom_quota` bigint DEFAULT '524288000',
  `custom_max_upload` bigint DEFAULT '20971520',
  `statuses` text,
  `youtube` text,
  `spotify` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `startup_position` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`nim`, `password`, `name`, `email`, `avatar`, `photo_id`, `type`, `startup_id`, `job_desk`, `is_approved`, `is_active`, `custom_quota`, `custom_max_upload`, `statuses`, `youtube`, `spotify`, `created_at`, `startup_position`) VALUES
('607012400003', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Muhammad Faisal Rahman', NULL, NULL, NULL, 'STARTUP', 'item-38f6122c-5c51-47ea-998c-39be69c4c7ed', '', 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'CTO'),
('607012400008', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Siti Amany Fakhirah Riby', NULL, NULL, NULL, 'STARTUP', 'item-ae7e384e-d902-4408-8f86-47ef925cd046', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400019', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', '⁠Andi Bayu Hanggoro', NULL, NULL, NULL, 'STARTUP', 'item-b25a6e5e-cf79-46a6-a3cd-a5f0d52a458e', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400029', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Ayesha al sidiq', NULL, NULL, NULL, 'STARTUP', 'item-5611c4d2-2507-49fc-992e-ec2c95056f11', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400032', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Ega Fiandra Pratama', NULL, NULL, NULL, 'STARTUP', 'item-b25a6e5e-cf79-46a6-a3cd-a5f0d52a458e', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400035', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Johanes Darren Yehuda', NULL, NULL, NULL, 'STARTUP', 'item-da2166d6-b816-490e-bdeb-87e2e1b049a3', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400036', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Shaena rintya bella', NULL, NULL, NULL, 'STARTUP', 'item-5611c4d2-2507-49fc-992e-ec2c95056f11', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400044', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Andi Ahmad Nurmadani', NULL, NULL, NULL, 'STARTUP', 'item-38f6122c-5c51-47ea-998c-39be69c4c7ed', 'koord devs ops', 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400047', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Fazrina Esa Putri Permana', NULL, NULL, NULL, 'STARTUP', 'item-da2166d6-b816-490e-bdeb-87e2e1b049a3', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400051', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Mas\'ud Ibnu Zarnuji', NULL, NULL, NULL, 'STARTUP', 'item-5611c4d2-2507-49fc-992e-ec2c95056f11', 'koord QA & Dok', 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400052', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Amelia Waruwu', NULL, NULL, NULL, 'STARTUP', 'item-38f6122c-5c51-47ea-998c-39be69c4c7ed', 'Tim QA & Dok', 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400053', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Zulfahmi', NULL, NULL, NULL, 'STARTUP', 'item-5611c4d2-2507-49fc-992e-ec2c95056f11', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400055', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Muhammad Hafizh Raharja', NULL, NULL, NULL, 'STARTUP', 'item-da2166d6-b816-490e-bdeb-87e2e1b049a3', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400059', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'khairunnisa nur aqila', NULL, NULL, NULL, 'STARTUP', 'item-141bb68d-e7d9-4140-89af-e0556c2b23cb', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400060', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Fahreza Azhar Ramadhan', NULL, NULL, NULL, 'STARTUP', 'item-5611c4d2-2507-49fc-992e-ec2c95056f11', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400063', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Amadea Salsabila Putri F', NULL, NULL, NULL, 'STARTUP', 'item-ae7e384e-d902-4408-8f86-47ef925cd046', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400064', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Rizky Nurdiansyah', NULL, NULL, NULL, 'STARTUP', 'item-5611c4d2-2507-49fc-992e-ec2c95056f11', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400068', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'M Haykal Lazuardy', NULL, NULL, NULL, 'STARTUP', 'item-b25a6e5e-cf79-46a6-a3cd-a5f0d52a458e', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400069', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Rafi Abi Assyarif', NULL, NULL, NULL, 'STARTUP', 'item-38f6122c-5c51-47ea-998c-39be69c4c7ed', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400072', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Afrisya Dwiky Mauliddinka', NULL, NULL, NULL, 'STARTUP', 'item-da2166d6-b816-490e-bdeb-87e2e1b049a3', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400073', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Ahmad Ropaldo', NULL, NULL, NULL, 'STARTUP', 'item-ae7e384e-d902-4408-8f86-47ef925cd046', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400075', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', '⁠Shafnat Fuaini Ramadhan', NULL, NULL, NULL, 'STARTUP', 'item-b25a6e5e-cf79-46a6-a3cd-a5f0d52a458e', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400076', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Vemas seftaesa dei setiawan', NULL, NULL, NULL, 'STARTUP', 'item-5611c4d2-2507-49fc-992e-ec2c95056f11', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400092', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'M. Dandy Alfariji', NULL, NULL, NULL, 'STARTUP', 'item-141bb68d-e7d9-4140-89af-e0556c2b23cb', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400100', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'April Adzania', NULL, NULL, NULL, 'STARTUP', 'item-ae7e384e-d902-4408-8f86-47ef925cd046', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400106', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Cantika anggi anggraheni', NULL, NULL, NULL, 'STARTUP', 'item-ae7e384e-d902-4408-8f86-47ef925cd046', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400123', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Rafi Khairan Putra', NULL, NULL, NULL, 'STARTUP', 'item-38f6122c-5c51-47ea-998c-39be69c4c7ed', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400125', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Nadine Nathania Pelleng', NULL, NULL, NULL, 'STARTUP', 'item-ae7e384e-d902-4408-8f86-47ef925cd046', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400128', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Tazkya Mutia Ramadhan', NULL, NULL, NULL, 'STARTUP', 'item-38f6122c-5c51-47ea-998c-39be69c4c7ed', 'Tim QA & Dok', 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400131', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Anak Agung Rizky Jhotama', NULL, NULL, NULL, 'STARTUP', 'item-141bb68d-e7d9-4140-89af-e0556c2b23cb', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012400136', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Zahara', NULL, NULL, NULL, 'STARTUP', 'item-141bb68d-e7d9-4140-89af-e0556c2b23cb', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012430001', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Dian Tri Sari Daeli', NULL, NULL, NULL, 'STARTUP', 'item-ae7e384e-d902-4408-8f86-47ef925cd046', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012430004', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Salman Ridhwan Qomarudin', NULL, NULL, NULL, 'STARTUP', 'item-da2166d6-b816-490e-bdeb-87e2e1b049a3', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012430005', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Alya Permata Nur Fajri', NULL, NULL, NULL, 'STARTUP', 'item-38f6122c-5c51-47ea-998c-39be69c4c7ed', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012430006', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Muhammad Taqi Izdihar', NULL, NULL, NULL, 'STARTUP', 'item-ae7e384e-d902-4408-8f86-47ef925cd046', 'BE', 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012430008', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Dalfa Munawwarotul Mahmudah', NULL, NULL, NULL, 'STARTUP', 'item-da2166d6-b816-490e-bdeb-87e2e1b049a3', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012430009', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Nanda Candikia', NULL, NULL, NULL, 'STARTUP', 'item-5611c4d2-2507-49fc-992e-ec2c95056f11', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012430010', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Muhammad Bagus Burhan', NULL, NULL, NULL, 'STARTUP', 'item-38f6122c-5c51-47ea-998c-39be69c4c7ed', 'tim devs ops', 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER'),
('607012430011', '6330dfcb898fb98454f0f24deee3eddc4300f371c8e41098f7e1d7d2ece66e5e', 'Naura Ramadhani', NULL, NULL, NULL, 'STARTUP', 'item-ae7e384e-d902-4408-8f86-47ef925cd046', NULL, 1, 1, 524288000, 20971520, NULL, NULL, NULL, '2026-09-20 07:43:24', 'MEMBER');

-- --------------------------------------------------------

--
-- Table structure for table `system_logs`
--

CREATE TABLE `system_logs` (
  `id` int NOT NULL,
  `timestamp` datetime DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `details` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `system_logs`
--

INSERT INTO `system_logs` (`id`, `timestamp`, `action`, `user_id`, `details`) VALUES
(1, '2026-09-20 14:40:34', 'manageStartup', 'ROOT', '{\"id\":\"item-38f6122c-5c51-47ea-998c-39be69c4c7ed\",\"type\":\"add\"}'),
(2, '2026-09-20 14:40:49', 'manageStartup', 'ROOT', '{\"id\":\"item-ae7e384e-d902-4408-8f86-47ef925cd046\",\"type\":\"add\"}'),
(3, '2026-09-20 14:41:01', 'manageStartup', 'ROOT', '{\"id\":\"item-da2166d6-b816-490e-bdeb-87e2e1b049a3\",\"type\":\"add\"}'),
(4, '2026-09-20 14:41:11', 'manageStartup', 'ROOT', '{\"id\":\"item-b25a6e5e-cf79-46a6-a3cd-a5f0d52a458e\",\"type\":\"add\"}'),
(5, '2026-09-20 14:41:21', 'manageStartup', 'ROOT', '{\"id\":\"item-141bb68d-e7d9-4140-89af-e0556c2b23cb\",\"type\":\"add\"}'),
(6, '2026-09-20 14:41:28', 'manageStartup', 'ROOT', '{\"id\":\"item-5611c4d2-2507-49fc-992e-ec2c95056f11\",\"type\":\"add\"}'),
(7, '2026-09-20 14:43:24', 'importStudents', 'ROOT', '{\"totalRows\":39,\"imported\":39,\"updated\":0,\"skipped\":0,\"failed\":0,\"failures\":[]}'),
(8, '2026-09-20 14:43:52', 'bulkManageMembers', 'ROOT', '{\"id\":null,\"bulkAction\":\"edit\",\"requested\":39}'),
(9, '2026-09-21 09:02:39', 'manageInternshipsBulk', 'ROOT', '{\"id\":null}'),
(10, '2026-09-21 09:05:22', 'manageInternshipsBulk', 'ROOT', '{\"id\":null}'),
(11, '2026-09-21 09:06:02', 'manageInternshipsBulk', 'ROOT', '{\"id\":null}'),
(12, '2026-09-21 09:06:12', 'manageInternship', 'ROOT', '{\"id\":\"internship-22c55f66-9124-4391-8434-5db62bfaaa03\",\"type\":\"edit\"}'),
(13, '2026-09-21 09:06:26', 'manageInternship', 'ROOT', '{\"id\":\"internship-67d18988-91bb-4c56-9744-d19a6cafa38b\",\"type\":\"edit\"}'),
(14, '2026-09-21 09:06:34', 'manageInternship', 'ROOT', '{\"id\":\"internship-533cefd6-442b-47b6-9d1c-9d998f4aaf15\",\"type\":\"edit\"}'),
(15, '2026-09-21 09:06:40', 'manageInternship', 'ROOT', '{\"id\":\"internship-ccd5f3ca-55db-4d1c-bb44-8d1df482558a\",\"type\":\"edit\"}'),
(16, '2026-09-21 09:06:45', 'manageInternship', 'ROOT', '{\"id\":\"internship-deeb6183-509e-4c35-a182-07c842cf53f4\",\"type\":\"edit\"}'),
(17, '2026-09-21 09:06:53', 'manageInternship', 'ROOT', '{\"id\":\"internship-eea2413c-96e7-4ea4-97ba-bd4e65adad82\",\"type\":\"edit\"}'),
(18, '2026-09-21 09:08:18', 'manageInternshipsBulk', 'ROOT', '{\"id\":null}'),
(19, '2026-09-21 09:08:44', 'manageInternshipsBulk', 'ROOT', '{\"id\":null}'),
(20, '2026-09-21 09:09:07', 'manageInternshipsBulk', 'ROOT', '{\"id\":null}'),
(21, '2026-09-21 10:21:03', 'manageInternship', 'ROOT', '{\"id\":\"internship-05cbc87f-be63-4f17-a4fa-81d3a0d91c02\",\"type\":\"edit\"}'),
(22, '2026-09-21 10:21:09', 'manageInternship', 'ROOT', '{\"id\":\"internship-44306cbd-8cff-4edb-b50e-24fa6c192126\",\"type\":\"edit\"}'),
(23, '2026-09-21 10:21:15', 'manageInternship', 'ROOT', '{\"id\":\"internship-ca3cfd2f-bdae-492a-9418-549dbc584e61\",\"type\":\"edit\"}'),
(24, '2026-09-21 10:21:21', 'manageInternship', 'ROOT', '{\"id\":\"internship-db49fda7-e9f0-4687-bda6-348227e2f611\",\"type\":\"edit\"}'),
(25, '2026-09-21 10:24:30', 'createWorkload', 'ROOT', '{\"workloadId\":\"workload-0fd19fb8-3b33-40ee-bd7c-db2479963220\"}'),
(26, '2026-09-21 10:25:04', 'addWorkloadMembers', 'ROOT', '{\"workloadId\":\"workload-0fd19fb8-3b33-40ee-bd7c-db2479963220\",\"memberCount\":7}'),
(27, '2026-09-21 22:46:41', 'createWorkload', 'ROOT', '{\"workloadId\":\"workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0\"}'),
(28, '2026-09-21 22:50:24', 'addWorkloadMembers', 'ROOT', '{\"workloadId\":\"workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0\",\"memberCount\":25}'),
(29, '2026-09-22 09:48:18', 'manageCategory', 'ROOT', '{\"id\":\"item-ad5adf36-ec99-44d0-9cb9-0e95c5d4420f\",\"type\":\"add\"}'),
(30, '2026-09-22 11:02:34', 'manageTag', 'ROOT', '{\"id\":\"item-c02bdaa5-300d-4877-87e6-fa7f74e66936\",\"type\":\"add\"}'),
(31, '2026-09-22 11:02:49', 'manageCategory', 'ROOT', '{\"id\":\"item-9d0e40b5-bd45-4106-b25f-433209e067df\",\"type\":\"add\"}'),
(32, '2026-09-22 11:03:21', 'manageTag', 'ROOT', '{\"id\":\"item-cee063bc-b810-42fc-adba-3f3fc3e4b01c\",\"type\":\"add\"}'),
(33, '2026-09-22 12:00:08', 'manageMember', 'ROOT', '{\"id\":\"607012400003\",\"type\":\"updateIdentity\"}'),
(34, '2026-09-22 12:01:12', 'updateStartupPosition', 'ROOT', '{\"studentId\":\"607012400003\",\"startupId\":\"item-38f6122c-5c51-47ea-998c-39be69c4c7ed\",\"oldPosition\":\"MEMBER\",\"newPosition\":\"CTO\"}'),
(35, '2026-09-22 12:01:12', 'manageMember', 'ROOT', '{\"id\":\"607012400003\",\"type\":\"updateIdentity\"}'),
(36, '2026-09-22 16:59:04', 'uploadCdnAsset', 'ROOT', '{\"assetId\":\"43e395b6-1d1a-4a27-8d3d-4e6bb189005c\",\"cdnFileId\":\"3a35ac8f4f62fa1e\",\"featureType\":\"STARTUP\"}'),
(37, '2026-09-22 16:59:04', 'manageStartup', 'ROOT', '{\"id\":\"item-ae7e384e-d902-4408-8f86-47ef925cd046\",\"type\":\"edit\"}'),
(38, '2026-09-22 17:00:18', 'uploadCdnAsset', 'ROOT', '{\"assetId\":\"df3840b1-d46a-4be0-a41e-dc49ed2b35e6\",\"cdnFileId\":\"9fa3e79377f0e3bb\",\"featureType\":\"STARTUP\"}'),
(39, '2026-09-22 17:00:18', 'manageStartup', 'ROOT', '{\"id\":\"item-38f6122c-5c51-47ea-998c-39be69c4c7ed\",\"type\":\"edit\"}'),
(40, '2026-09-22 21:50:35', 'updateProfile', 'ROOT', '{\"id\":\"ROOT\"}'),
(41, '2026-09-22 22:24:35', 'updateProfile', 'ROOT', '{\"id\":\"ROOT\"}'),
(42, '2026-09-23 07:17:43', 'updateProfile', 'ROOT', '{\"id\":\"ROOT\"}'),
(43, '2026-09-23 13:31:31', 'manageInformasi', 'ROOT', '{\"id\":\"item-61351b2f-7b50-4aa5-9813-2806df303f33\",\"type\":\"add\"}'),
(44, '2026-09-23 13:32:38', 'manageInformasi', 'ROOT', '{\"id\":\"item-f0a72535-1d23-4881-b632-7179af90c771\",\"type\":\"add\"}'),
(45, '2026-09-23 13:34:51', 'manageInformasi', 'ROOT', '{\"id\":\"item-d3d9d8ed-9cd0-4f78-aad6-b601ae9f78b4\",\"type\":\"add\"}'),
(46, '2026-09-23 13:36:12', 'manageInformasi', 'ROOT', '{\"id\":\"item-1fd23b69-c73d-411a-b94c-b5d0ad04099e\",\"type\":\"add\"}'),
(47, '2026-09-23 14:30:55', 'manageInformasi', 'ROOT', '{\"id\":\"item-d9c9b63d-bac9-4345-b22d-04c82fddba1e\",\"type\":\"add\"}'),
(48, '2026-09-23 14:32:26', 'manageSchedule', 'ROOT', '{\"id\":\"item-0ac472e4-06d9-4374-955c-9746d318b05b\",\"type\":\"add\"}'),
(49, '2026-09-23 14:37:44', 'manageEvent', 'ROOT', '{\"id\":\"evt-1790149064086\",\"type\":\"add\"}'),
(50, '2026-09-23 14:41:32', 'uploadCdnAsset', 'ROOT', '{\"assetId\":\"944fee26-0002-462d-a4a5-78422ae852f4\",\"cdnFileId\":\"38df62cae7844630\",\"featureType\":\"EVENT\"}'),
(51, '2026-09-23 14:41:32', 'manageEvent', 'ROOT', '{\"id\":\"evt-1790149064086\",\"type\":\"edit\"}'),
(52, '2026-09-23 14:46:16', 'uploadCdnAsset', 'ROOT', '{\"assetId\":\"2f7b8ef7-0679-4cf7-8b02-5958c29cb8a2\",\"cdnFileId\":\"53bf84a774258f95\",\"featureType\":\"EVENT\"}'),
(53, '2026-09-23 14:46:16', 'manageEvent', 'ROOT', '{\"id\":\"evt-1790149537960\",\"type\":\"add\"}'),
(54, '2026-09-23 15:09:14', 'uploadCdnAsset', 'ROOT', '{\"assetId\":\"a1e30205-016d-41ff-aa94-57423a7b39a5\",\"cdnFileId\":\"35702da3893c5073\",\"featureType\":\"ARTICLE\"}'),
(55, '2026-09-23 15:09:14', 'manageArticle', 'ROOT', '{\"id\":\"art-1790150939809\",\"type\":\"add\"}'),
(56, '2026-09-23 15:24:20', 'uploadCdnAsset', 'ROOT', '{\"assetId\":\"f13b038d-d9f5-4301-945d-af07c89ee138\",\"cdnFileId\":\"de3c4d34c20e1d55\",\"featureType\":\"ARTICLE_ATTACHMENT\"}'),
(57, '2026-09-23 15:24:33', 'uploadCdnAsset', 'ROOT', '{\"assetId\":\"3c933701-aba1-419f-9d95-4ff1c5b35683\",\"cdnFileId\":\"21588983b8a24fa8\",\"featureType\":\"ARTICLE_ATTACHMENT\"}'),
(58, '2026-09-23 15:24:33', 'manageArticle', 'ROOT', '{\"id\":\"art-1790150939809\",\"type\":\"edit\"}'),
(59, '2026-09-23 15:26:53', 'manageTag', 'ROOT', '{\"id\":\"item-a0245c42-63c2-46a5-a103-72fa34e66832\",\"type\":\"add\"}'),
(60, '2026-09-23 15:27:00', 'manageTag', 'ROOT', '{\"id\":\"item-c168df72-ee87-4948-a17a-f430bc9845b8\",\"type\":\"add\"}'),
(61, '2026-09-23 15:27:06', 'manageTag', 'ROOT', '{\"id\":\"item-7bd92700-b46c-4b6e-9466-4aa66ddb2746\",\"type\":\"add\"}'),
(62, '2026-09-23 15:28:31', 'uploadCdnAsset', 'ROOT', '{\"assetId\":\"82a22ecd-b47d-47e8-afa2-2cf288c3743b\",\"cdnFileId\":\"8d215700479aaa8e\",\"featureType\":\"ARTICLE_THUMBNAIL\"}'),
(63, '2026-09-23 15:28:44', 'uploadCdnAsset', 'ROOT', '{\"assetId\":\"59727d30-1882-46ce-99de-7b947b9b63aa\",\"cdnFileId\":\"81d28d3cc8b4ae9d\",\"featureType\":\"ARTICLE_ATTACHMENT\"}'),
(64, '2026-09-23 15:28:51', 'uploadCdnAsset', 'ROOT', '{\"assetId\":\"b78ca3f8-037d-460e-a5f5-796f5c4c39fe\",\"cdnFileId\":\"bf5f817d33f0bfd7\",\"featureType\":\"ARTICLE_ATTACHMENT\"}'),
(65, '2026-09-23 15:28:59', 'uploadCdnAsset', 'ROOT', '{\"assetId\":\"8d1059fe-c193-4921-a401-6c3201394762\",\"cdnFileId\":\"d024f4a6fab6cc8a\",\"featureType\":\"ARTICLE_ATTACHMENT\"}'),
(66, '2026-09-23 15:28:59', 'manageArticle', 'ROOT', '{\"id\":\"art-8a3dcd0c-3e93-4111-8487-918b0f3ffd6a\",\"type\":\"add\"}'),
(67, '2026-09-23 15:41:30', 'manageArticle', 'ROOT', '{\"id\":\"art-82c0f467-ca5f-436d-a3bf-e84e0c4d1380\",\"type\":\"add\"}'),
(68, '2026-09-23 15:44:26', 'manageArticle', 'ROOT', '{\"id\":\"art-82c0f467-ca5f-436d-a3bf-e84e0c4d1380\",\"type\":\"delete\"}'),
(69, '2026-09-23 15:46:01', 'uploadCdnAsset', 'ROOT', '{\"assetId\":\"32ca65fa-bdd8-4b02-8402-63df0f4fe90f\",\"cdnFileId\":\"fdcd1505b8e62552\",\"featureType\":\"ARTICLE_THUMBNAIL\"}'),
(70, '2026-09-23 15:46:09', 'uploadCdnAsset', 'ROOT', '{\"assetId\":\"7dba2c8f-c010-4840-a063-681e48486c58\",\"cdnFileId\":\"74d9178c49fe51a7\",\"featureType\":\"ARTICLE_ATTACHMENT\"}'),
(71, '2026-09-23 15:46:09', 'manageArticle', 'ROOT', '{\"id\":\"art-b9192a79-528c-4f52-ac86-442515f4e6c6\",\"type\":\"add\"}'),
(72, '2026-09-23 15:48:07', 'manageArticle', 'ROOT', '{\"id\":\"art-b9192a79-528c-4f52-ac86-442515f4e6c6\",\"type\":\"delete\"}'),
(73, '2026-09-23 16:32:14', 'uploadCdnAsset', 'ROOT', '{\"assetId\":\"05e5c0fa-adfc-4ada-be58-e5fb5c7b138c\",\"cdnFileId\":\"a2e21b55030577f9\",\"featureType\":\"ARTICLE_THUMBNAIL\"}'),
(74, '2026-09-23 16:32:25', 'manageArticle', 'ROOT', '{\"id\":\"art-05c6a7a7-55df-4b10-a028-5248418a0a19\",\"type\":\"add\"}'),
(75, '2026-09-24 05:44:06', 'addAnnouncement', 'ROOT', '{\"id\":\"item-9407af88-6766-4bbd-990e-5507a896b054\"}'),
(76, '2026-09-24 05:44:54', 'addAnnouncement', 'ROOT', '{\"id\":\"item-d9ca12df-7ac5-45aa-aab5-b064beb33ccf\"}'),
(77, '2026-09-24 05:50:35', 'addAnnouncement', 'ROOT', '{\"id\":\"item-b5efa07a-edbb-4cf7-89aa-f791cacd5e62\"}'),
(78, '2026-09-24 06:00:19', 'updateAssets', 'ROOT', '{\"id\":null}'),
(79, '2026-09-24 06:23:19', 'exportStudentsExcel', 'ROOT', '{\"totalRows\":39,\"search\":\"\"}'),
(80, '2026-09-24 06:25:13', 'uploadCdnAsset', 'ROOT', '{\"assetId\":\"52fc984d-1a10-4529-8280-4e4cef36a75e\",\"cdnFileId\":\"9235b069b938b252\",\"featureType\":\"STARTUP\"}'),
(81, '2026-09-24 06:25:13', 'manageStartup', 'ROOT', '{\"id\":\"item-da2166d6-b816-490e-bdeb-87e2e1b049a3\",\"type\":\"edit\"}'),
(82, '2026-09-24 06:55:32', 'manageStartup', 'ROOT', '{\"id\":\"item-38f6122c-5c51-47ea-998c-39be69c4c7ed\",\"type\":\"edit\"}'),
(83, '2026-09-24 08:36:27', 'manageCategory', 'ROOT', '{\"id\":\"item-8b173c52-bac0-4036-92a7-58bcbfb0dc5f\",\"type\":\"add\"}'),
(84, '2026-09-24 08:36:39', 'manageCategory', 'ROOT', '{\"id\":\"item-e9616635-aede-4b45-91cb-096a10ac17fc\",\"type\":\"add\"}'),
(85, '2026-09-24 08:36:46', 'manageCategory', 'ROOT', '{\"id\":\"item-aa8537f8-8bf8-42e2-b594-08272745b070\",\"type\":\"add\"}'),
(86, '2026-09-24 08:36:54', 'manageCategory', 'ROOT', '{\"id\":\"item-e6a33a6a-df45-4333-898b-c4a3ca58a34c\",\"type\":\"add\"}'),
(87, '2026-09-24 08:37:02', 'manageCategory', 'ROOT', '{\"id\":\"item-bac84111-18c1-48bf-a52d-052ef4558946\",\"type\":\"add\"}'),
(88, '2026-09-24 08:37:16', 'manageTag', 'ROOT', '{\"id\":\"item-822bdf60-e34c-4734-b4d7-8c7c3275920d\",\"type\":\"add\"}'),
(89, '2026-09-24 08:37:26', 'manageTag', 'ROOT', '{\"id\":\"item-121122c3-3c1a-4a82-ae50-5fe81d7950ef\",\"type\":\"add\"}'),
(90, '2026-09-24 08:37:33', 'manageTag', 'ROOT', '{\"id\":\"item-56aa7854-cd97-4f20-a3b5-075601d99285\",\"type\":\"add\"}'),
(91, '2026-09-24 08:37:40', 'manageTag', 'ROOT', '{\"id\":\"item-acd1c7d2-7f56-40cc-84c8-a3c950db21b9\",\"type\":\"add\"}'),
(92, '2026-09-24 08:37:49', 'manageTag', 'ROOT', '{\"id\":\"item-e1fde971-4765-4c21-85c1-8098a570bce7\",\"type\":\"add\"}'),
(93, '2026-09-24 08:43:41', 'manageArticle', 'ROOT', '{\"id\":\"art-17700d88-cecc-48a6-9d45-7c6eba8f5ecd\",\"type\":\"add\"}'),
(94, '2026-09-24 08:44:00', 'manageArticle', 'ROOT', '{\"id\":\"art-17700d88-cecc-48a6-9d45-7c6eba8f5ecd\",\"type\":\"delete\"}'),
(95, '2026-09-24 08:44:41', 'updateAssets', 'ROOT', '{\"id\":null}');

-- --------------------------------------------------------

--
-- Table structure for table `trash`
--

CREATE TABLE `trash` (
  `id` varchar(100) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `url` text,
  `date` datetime DEFAULT NULL,
  `size` bigint DEFAULT NULL,
  `mime` varchar(100) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `owner_id` varchar(50) DEFAULT NULL,
  `role` enum('STUDENT','LECTURER','ADMIN') DEFAULT NULL,
  `original_parent_id` varchar(100) DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `type` enum('FILE','FOLDER') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tvlive`
--

CREATE TABLE `tvlive` (
  `id` varchar(50) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `video_id` varchar(100) DEFAULT NULL,
  `thumbnail` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `workloads`
--

CREATE TABLE `workloads` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(50) NOT NULL,
  `description` text,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` varchar(50) NOT NULL,
  `pic_id` varchar(50) NOT NULL,
  `pic_role` varchar(50) NOT NULL,
  `created_by` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `workloads`
--

INSERT INTO `workloads` (`id`, `name`, `category`, `description`, `start_date`, `end_date`, `status`, `pic_id`, `pic_role`, `created_by`, `created_at`) VALUES
('workload-0fd19fb8-3b33-40ee-bd7c-db2479963220', 'Telin KMS', 'PROJECT', 'Project membuat web KMS Telin', '2026-04-13', '2026-08-31', 'ACTIVE', '25850011', 'LECTURER', 'ROOT', '2026-09-21 03:24:30'),
('workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', 'BESTARI SAINTEK', 'PROJECT', 'Project BESTARI SAINTEK Sorgum Living Labs', '2026-05-11', '2027-04-30', 'ACTIVE', '11810053', 'LECTURER', 'ROOT', '2026-09-21 15:46:41');

-- --------------------------------------------------------

--
-- Table structure for table `workload_members`
--

CREATE TABLE `workload_members` (
  `id` varchar(36) NOT NULL,
  `workload_id` varchar(50) NOT NULL,
  `member_id` varchar(50) NOT NULL,
  `member_role` varchar(50) NOT NULL,
  `job_desk` varchar(255) DEFAULT NULL,
  `joined_at` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `workload_members`
--

INSERT INTO `workload_members` (`id`, `workload_id`, `member_id`, `member_role`, `job_desk`, `joined_at`) VALUES
('1e4dd517-3d12-47cc-9785-f76f2c7ecda6', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012400019', 'STUDENT', NULL, NULL),
('2017ebeb-2c10-4204-abd0-fc4fac565f63', 'workload-0fd19fb8-3b33-40ee-bd7c-db2479963220', '607012400051', 'STUDENT', NULL, NULL),
('208e4023-8ae8-49c3-bd2a-003164e251ba', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012400068', 'STUDENT', NULL, NULL),
('217474dd-7b2b-48ba-9646-93bf50a4feac', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012400044', 'STUDENT', NULL, NULL),
('21808943-ef21-407e-965c-ceb76b06134d', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012400063', 'STUDENT', NULL, NULL),
('238fc790-09a7-48cc-bf42-19d3663e6480', 'workload-0fd19fb8-3b33-40ee-bd7c-db2479963220', '607012430006', 'STUDENT', NULL, NULL),
('2b88dd01-e563-42cc-becb-ef86c058935f', 'workload-0fd19fb8-3b33-40ee-bd7c-db2479963220', '607012400052', 'STUDENT', NULL, NULL),
('371961ba-a049-4f97-a2e1-15024ecf9816', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012400131', 'STUDENT', NULL, NULL),
('3d6f208c-ae47-44a2-bf3a-c2679f4b3df1', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012400032', 'STUDENT', NULL, NULL),
('4282d069-dc7b-48ae-808e-1170f6d95168', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012430010', 'STUDENT', NULL, NULL),
('4998ccf8-18e5-472c-a3b6-44184b33f5df', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012400075', 'STUDENT', NULL, NULL),
('51e96000-761b-43c9-aa29-46dccd2f04e5', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012400055', 'STUDENT', NULL, NULL),
('529ab241-61e6-4bb2-9e4b-89ec71cd3a5c', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012400092', 'STUDENT', NULL, NULL),
('6024a14b-c02e-4446-8f59-a8b9bddcf63b', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012400072', 'STUDENT', NULL, NULL),
('636df5fc-7180-49a3-9784-1a06113f301d', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012400053', 'STUDENT', NULL, NULL),
('8e606ef2-d522-4b4b-84a2-deece1b1e972', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '25980015', 'LECTURER', NULL, NULL),
('9829ca2c-af31-45f4-bfa5-bd91a77558ce', 'workload-0fd19fb8-3b33-40ee-bd7c-db2479963220', '607012430010', 'STUDENT', NULL, NULL),
('9c57ebbb-b37d-4628-affa-f0c7e182d408', 'workload-0fd19fb8-3b33-40ee-bd7c-db2479963220', '607012400128', 'STUDENT', NULL, NULL),
('9d19f4a6-1fd3-462a-9d50-2a5362634273', 'workload-0fd19fb8-3b33-40ee-bd7c-db2479963220', '607012400044', 'STUDENT', NULL, NULL),
('a4660eb6-5e1d-46ad-ae79-2ae478ebf503', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012400136', 'STUDENT', NULL, NULL),
('a68a9538-d1ed-4442-a120-ffb350927848', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012430004', 'STUDENT', NULL, NULL),
('b9b3deed-d671-44aa-b34c-c9662e521a75', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '25850011', 'LECTURER', NULL, NULL),
('ba328e7b-cf36-4732-ab17-0f8af5c81f38', 'workload-0fd19fb8-3b33-40ee-bd7c-db2479963220', '607012400123', 'STUDENT', NULL, NULL),
('bc6801be-1234-4da8-9958-0112f94b48b8', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012430005', 'STUDENT', NULL, NULL),
('c06d5c05-9ab1-439a-9369-16a001056956', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012400100', 'STUDENT', NULL, NULL),
('d33f010a-42bc-42c0-a4eb-a588229ad60b', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012400069', 'STUDENT', NULL, NULL),
('daf302b8-c1e7-4be1-b694-416a39c6f795', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012400035', 'STUDENT', NULL, NULL),
('e1bba76a-a538-4b0c-924c-fec770317c65', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012400052', 'STUDENT', NULL, NULL),
('e1c4b2d5-5327-44ce-84d3-e19190118e09', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012430001', 'STUDENT', NULL, NULL),
('eee9122d-6339-40f7-b89a-0dd33d0420d3', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012400128', 'STUDENT', NULL, NULL),
('f2c45c56-3b0e-4d80-ac0d-88d04b01e57b', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012400123', 'STUDENT', NULL, NULL),
('f3d6c165-e10b-4923-bf9b-52b0fe8d63c4', 'workload-f65d091c-b6ba-4e4b-b5eb-42fd25bce0e0', '607012400003', 'STUDENT', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `yplaylists`
--

CREATE TABLE `yplaylists` (
  `playlist_id` varchar(100) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `thumbnail` text,
  `published_at` datetime DEFAULT NULL,
  `channel_title` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`username`);

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `articles`
--
ALTER TABLE `articles`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `article_attachments`
--
ALTER TABLE `article_attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_attachments_article` (`article_id`);

--
-- Indexes for table `article_categories`
--
ALTER TABLE `article_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `article_tags`
--
ALTER TABLE `article_tags`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indexes for table `article_tag_map`
--
ALTER TABLE `article_tag_map`
  ADD PRIMARY KEY (`article_id`,`tag_id`);

--
-- Indexes for table `assets`
--
ALTER TABLE `assets`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `audit_forensics`
--
ALTER TABLE `audit_forensics`
  ADD PRIMARY KEY (`log_id`);

--
-- Indexes for table `cdn_assets`
--
ALTER TABLE `cdn_assets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cdn_assets_owner` (`owner_id`,`owner_role`),
  ADD KEY `idx_cdn_assets_feature` (`feature_type`,`feature_id`),
  ADD KEY `idx_cdn_assets_status` (`cdn_status`);

--
-- Indexes for table `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `file_blobs`
--
ALTER TABLE `file_blobs`
  ADD PRIMARY KEY (`repo_id`);

--
-- Indexes for table `information`
--
ALTER TABLE `information`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `integration_results`
--
ALTER TABLE `integration_results`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `internships`
--
ALTER TABLE `internships`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_internships_student` (`student_nim`),
  ADD KEY `idx_internships_startup` (`startup_id`),
  ADD KEY `idx_internships_academic` (`academic_supervisor_nip`),
  ADD KEY `idx_internships_academic2` (`academic_supervisor2_nip`),
  ADD KEY `idx_internships_status` (`status`);

--
-- Indexes for table `lecturers`
--
ALTER TABLE `lecturers`
  ADD PRIMARY KEY (`nip`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `photobooth_settings`
--
ALTER TABLE `photobooth_settings`
  ADD PRIMARY KEY (`category`);

--
-- Indexes for table `repo`
--
ALTER TABLE `repo`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `schedules`
--
ALTER TABLE `schedules`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `startup_teams`
--
ALTER TABLE `startup_teams`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`nim`),
  ADD KEY `idx_students_startup_position` (`startup_id`,`startup_position`);

--
-- Indexes for table `system_logs`
--
ALTER TABLE `system_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `trash`
--
ALTER TABLE `trash`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tvlive`
--
ALTER TABLE `tvlive`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `workloads`
--
ALTER TABLE `workloads`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `workload_members`
--
ALTER TABLE `workload_members`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workload` (`workload_id`),
  ADD KEY `idx_member` (`member_id`,`member_role`);

--
-- Indexes for table `yplaylists`
--
ALTER TABLE `yplaylists`
  ADD PRIMARY KEY (`playlist_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `assets`
--
ALTER TABLE `assets`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `system_logs`
--
ALTER TABLE `system_logs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=96;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
