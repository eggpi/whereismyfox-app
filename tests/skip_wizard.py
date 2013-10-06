import marionette
import gaia_test

mn = marionette.Marionette()
mn.start_session()

ga = gaia_test.GaiaApps(mn)
ga.launch("WhereIsMyFox?")

geo_config_btn = mn.find_element("id", "begin-geo-config")
geo_config_btn.click()

app_frame = mn.get_active_frame()

mn.switch_to_frame()
share_btn = mn.find_element("id", "permission-yes")
share_btn.click()

mn.switch_to_frame(app_frame)
device_name_input = mn.find_element("id", "device-name")
device_name_input.send_keys("lost fox")

submit_btn = mn.find_element("id", "register-submit")
submit_btn.click()
