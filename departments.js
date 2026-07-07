// Single source of truth for departments/areas — used by the API (validation,
// /api/meta) and referenced by the frontend via that endpoint so the list
// only needs to be maintained in one place.
module.exports = [
  { name: "Radio (Digital & Programming)", areas: [
    "Ramogi FM","Inooro FM","Musyi FM","Chamgei FM","Muuga FM","Egesa FM",
    "Mulembe FM","Wimwaro FM","Bahari FM","Vuuka FM","Sulwe FM"] },
  { name: "TV Production", areas: [
    "Video Editing","Creative","Graphic Design","Library","Programming (Traffic Control)",
    "Promo Production","TV Directing","Production Assistant","VIUSASA","Traffic Control"] },
  { name: "Digital", areas: [
    "Social Media Management","Video Production","Website Writing"] },
  { name: "Editorial", areas: [
    "News Reporting (TV)","News Reporting (Radio)","Sports Journalism"] },
  { name: "Technical Site", areas: [
    "Electrical Engineering","Electronics","Telecommunication / Broadcast Engineering"] },
  { name: "Studio Technical Operations (STO)", areas: [
    "Camera (Studio)","Lighting","Vision Mixing","Sound"] },
  { name: "ICT Services", areas: [
    "Web Development","Help Desk","User Support","Hardware & Software Troubleshooting","Networking"] },
  { name: "Marketing", areas: [
    "Guest Relations","Events"] },
  { name: "HR & Administration", areas: [
    "HR Intern","Front Office"] },
];
