import importlib.util, os, unittest
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("thumbnail", os.path.join(HERE, "..", "tools", "thumbnail.py"))
thumb = importlib.util.module_from_spec(spec); spec.loader.exec_module(thumb)


class ThumbnailTemplates(unittest.TestCase):
    def test_every_template_builds_valid_svg_with_title(self):
        for n in thumb.AREA:
            svg = thumb.build(n, "116 of 130|written blind", "116", "lab receipt")
            root = ET.fromstring(svg)
            texts = "".join(root.itertext())
            self.assertIn("written", texts, n)
            self.assertIn("LAB RECEIPT", texts, n)

    def test_templates_are_self_contained(self):
        for n in thumb.AREA:
            raw = open(os.path.join(thumb.TPL, f"tpl_{n}.svg"), encoding="utf-8").read()
            for bad in ("<image", "http://", "https://", "@import", "@font-face"):
                if bad == "http://" and raw.count(bad) == raw.count('xmlns="http://www.w3.org/2000/svg"'):
                    continue
                self.assertNotIn(bad, raw.replace('xmlns="http://www.w3.org/2000/svg"', ""), f"tpl_{n}: {bad}")

    def test_title_is_escaped(self):
        svg = thumb.build("01", "a <b> & c", None, None)
        ET.fromstring(svg)


if __name__ == "__main__":
    unittest.main()
