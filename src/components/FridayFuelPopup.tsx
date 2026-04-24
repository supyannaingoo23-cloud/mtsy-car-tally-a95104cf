import { useEffect, useState } from "react";
import { Fuel } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const POPUP_KEY = "mtsy:fridayReminder:popupShownFor"; // yyyy-mm-dd of last shown Friday

const todayStr = () => new Date().toISOString().slice(0, 10);
const isFriday = () => new Date().getDay() === 5;

const FridayFuelPopup = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isFriday()) return;
    const shownFor = localStorage.getItem(POPUP_KEY);
    if (shownFor !== todayStr()) {
      setOpen(true);
      localStorage.setItem(POPUP_KEY, todayStr());
    }
  }, []);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5 text-primary" />
            It's Friday!
          </AlertDialogTitle>
          <AlertDialogDescription>
            Please update the weekly Fuel Prices so your records stay accurate.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Later</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setOpen(false);
              navigate("/settings");
            }}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            Update Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default FridayFuelPopup;
